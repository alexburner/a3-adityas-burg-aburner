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

WK.QueueDiagramView = function(queue) {
    WK.Object.call(this);

    console.assert(queue instanceof WK.PatchQueue, queue);
    this.queue = queue;

    this.element = document.createElement("li");
    this.element.className = "queue";

    this.queueMetrics = new WK.PatchQueueMetrics(queue, {'attempts': []}); // Start with nothing.
}

WK.QueueDiagramView.prototype = {
    __proto__: WK.Object.prototype,
    constructor: WK.QueueDiagramView,

    get name()
    {
        return this.queue.shortName;
    },

    get queueMetrics()
    {
        return this._metrics;
    },

    set queueMetrics(value)
    {
        console.assert(value instanceof WK.PatchQueueMetrics, value);
        this._metrics = value;
        this.render();
    },

    render: function()
    {
        this.element.removeChildren();
        this.element.appendChild($(WK.ViewTemplates.queueDiagramStart(this)).get(0));
        this.queueMetrics.attempts.forEach(function (attempt) {
            this.element.appendChild($(WK.ViewTemplates.queueDiagramAttempt(attempt)).get(0));
        }, this);
    }
};
