/*
 * Copyright (C) 2015 University of Washington.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 * 1. Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE INC. AND ITS CONTRIBUTORS ``AS IS''
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO,
 * THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
 * PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL APPLE INC. OR ITS CONTRIBUTORS
 * BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF
 * THE POSSIBILITY OF SUCH DAMAGE.
 */

WK.PipelineViewController = function() {
    WK.Object.call(this);

    // First, set up data sources.
    this._tracDataSource = new WK.TracDataSource("https://trac.webkit.org/");
    this._tracDataSource.addEventListener(WK.TracDataSource.Event.CommitsUpdated, this._commitDataUpdated, this);

    this._patchQueueDataSource = new WK.PatchQueueDataSource("https://webkit-queues.appspot.com/");

    this.macQueue = this._patchQueueDataSource.queues["mac-wk2-ews"];
    this.iosQueue = this._patchQueueDataSource.queues["ios-ews"];

    this.queues = new Map;
    this.queues.set(this.macQueue.id, this.macQueue);
    this.queues.set(this.iosQueue.id, this.iosQueue);

    this.patches = new Map;

    this.macQueueDiagramView = new WK.QueueDiagramView(this.macQueue);
    this.iosQueueDiagramView = new WK.QueueDiagramView(this.iosQueue);

    var pickerElement = this._pickerElement = document.createElement("span");
    pickerElement.id = "range-picker";
    pickerElement.size = 40;
    pickerElement.textContent = "Please select a date range";
    $(".date-selection").append(pickerElement);

    $("#range-picker")
    .dateRangePicker({
        startOfWeek: navigator.language === "en-us" ? "sunday" : "monday",
        endDate: new Date(),
        showShortcuts: false,
        getValue: function() { return this.textContent; },
        setValue: function(value) { this.textContent = value; }
    })
    .on('datepicker-apply', function(event, picker) {
        // This message is dispatched even when range hasn't been selected (or only one endpoint was),
        // in which case the actual range hasn't changed, and there is nothing to do.
        if (isNaN(picker.date1) || isNaN(picker.date2))
            return;

        var endDate = new Date(new Date(picker.date2).setDate(picker.date2.getDate() + 1));
        this._dateRangeChanged(picker.date1, endDate)
    }.bind(this));

    var $queueList = $('<ul class="queue-diagrams"></ul>');
    $queueList.append(this.macQueueDiagramView.element);
    $queueList.append(this.iosQueueDiagramView.element);
    $(".queue-container").append($queueList);

    var $histogramSection = $('<div class="histograms" />');
    // FIXME: insert the histogram building stuff here.
    $("#content").append($histogramSection);

    var $detailsSection = $('<div class="details" />');
    this._buildAttemptsTable = new WK.BuildAttemptTableView();
    $detailsSection.append(this._buildAttemptsTable.element);
    $("#content").append($detailsSection);

    // Set up initial state.

    // This is synced with the current time selection, but not any other filters.
    this.selectedPatches = [];
}

WK.PipelineViewController.prototype = {
    __proto__: WK.Object.prototype,
    constructor: WK.PipelineViewController,

    // Public

    setDateRange: function(startDate, endDate)
    {
        $(this._pickerElement).data('dateRangePicker').setDateRange(startDate, endDate);
        this._dateRangeChanged(startDate, endDate);
    },

    get patchResults()
    {
        return this._patchResults.slice();
    },

    set patchResults(value)
    {
        if (!_.isArray(value))
            return;

        this._patchResults = value;
        this._recomputePatchAttempts();
        this._recomputePatchMetrics();
    },

    // Private

    _dateRangeChanged: function(startDate, endDate)
    {
        if (this._startDate === startDate && this._endDate === endDate)
            return;

        this._startDate = startDate;
        this._endDate = endDate;

        if (this._tracLoadingMessage) {
            $(this._tracLoadingMessage).remove();
            delete this._tracLoadingMessage;
        }

        if (this._queueLoadingMessage) {
            $(this._queueLoadingMessage).remove();
            delete this._queueLoadingMessage;
        }

        this._tracDataSource.fetchCommitsForDateRange(this._startDate, this._endDate);
        this._tracLoadingMessage = $('<li>Loading commit metadata...</li>');
        $("ul.status-messages").append(this._tracLoadingMessage);

        this._patchQueueDataSource.fetchPatchResultsForDateRange(this._startDate, this._endDate, this._patchResultsReceived.bind(this));
        this._queueLoadingMessage = $('<li>Loading patch queue data...</li>');
        $("ul.status-messages").append(this._queueLoadingMessage);
    },

    _commitDataUpdated: function()
    {
        console.log("Fetched commits from trac: ", this._tracDataSource.recordedCommits);

        if (this._tracLoadingMessage) {
            $(this._tracLoadingMessage).remove();
            delete this._tracLoadingMessage;
        }
    },

    _patchResultsReceived: function(patchResults)
    {
        console.log("Fetched patchResults from queue server: ", patchResults);

        if (this._queueLoadingMessage) {
            $(this._queueLoadingMessage).remove();
            delete this._queueLoadingMessage;
        }

        _.each(patchResults, function(result) {
            // FIXME: create new WK.Patch if necessary, and attach this result to it.
            // Then, recompute attempts and metrics for each queue.
        }, this);
        this.patchResults = patchResults;
    },

    _recomputePatchAttempts: function()
    {
        // FIXME: get real PatchAttempt objects from the Patch.
        // This will require data format changes in the view:
        // * the bug metadata needs to be manually joined from Bugzilla
        // * we don't know the actual processing time per attempt, just total time.
        //   this would be trivial to include on the backend, but we can't change that. :-(
        this._buildAttemptsTable.attempts = WK.DummyData.buildAttempts;
    },

    _recomputePatchMetrics: function()
    {
        // FIXME: use real data.
        this.macQueueDiagramView.queueMetrics = new WK.PatchQueueMetrics(this.macQueue, WK.DummyData.macQueueMetrics);
        this.iosQueueDiagramView.queueMetrics = new WK.PatchQueueMetrics(this.iosQueue, WK.DummyData.iosQueueMetrics);
    },
};
