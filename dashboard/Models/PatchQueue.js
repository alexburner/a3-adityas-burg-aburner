/*
 * Copyright (C) 2013, 2014 Apple Inc. All rights reserved.
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

WK.PatchQueue = function(dataSource, id, info)
{
    WK.Object.call(this);

    console.assert(dataSource instanceof WK.PatchQueueDataSource);
    console.assert(id);

    this._dataSource = dataSource;

    this.id = id;
    this.shortName = info.shortName || id;
    this.title = info.title || "\xa0";

    this.platform = info.platform ? info.platform.name : "unknown";
};

WK.Object.addConstructorFunctions(WK.PatchQueue);

WK.PatchQueue.Event = {
    Updated: "updated"
};

WK.PatchQueue.prototype = {
    constructor: WK.PatchQueue,
    __proto__: WK.Object.prototype,

    get statusPageURL()
    {
        return this._dataSource.queueStatusURLForQueue(this);
    },

    get chartsPageURL()
    {
        return this._chartsPageURL;
    },

    get patchCount()
    {
        return this._patchCount;
    },

    get loadedDetailedStatus()
    {
        return this._loadedDetailedStatus;
    },

    get attempts()
    {
        console.assert(this._loadedDetailedStatus);
        return this._attempts;
    },

    get bots()
    {
        console.assert(this._loadedDetailedStatus);
        return this._bots;
    },

    update: function()
    {
        this._loadedDetailedStatus = false;

        JSON.load(this._dataSource.jsonQueueLengthURLForQueue(this), function(data) {
            var newPatchCount = data.queue_length;
            if (this._patchCount === newPatchCount)
                return;
            this._patchCount = newPatchCount;
            this.dispatchEventToListeners(WK.PatchQueue.Event.Updated);
        }.bind(this));
    },

    loadDetailedStatus: function(callback)
    {
        JSON.load(this._dataSource.jsonQueueStatusURLForQueue(this), function(data) {
            this._attempts = [];
            for (var i = 0, end = data.queue.length; i < end; ++i) {
                var patch = data.queue[i];
                var activeSinceTime = patch.active_since ? Date.parse(patch.active_since) : 0;
                // FIXME: extract to PatchAttempt.
                this._attempts.push({
                    attachmentID: patch.attachment_id,
                    statusPageURL: patch.status_page,
                    latestMessage: patch.latest_message,
                    latestMessageTime: patch.latest_message_time ? new Date(patch.latest_message_time) : null,
                    detailedResultsURLForLatestMessage: patch.latest_results,
                    retryCount: patch.retry_count,
                    active: patch.active,
                    activeSince: new Date(activeSinceTime),
                });
            }

            this._bots = [];
            for (var i = 0, end = data.bots.length; i < end; ++i) {
                var bot = data.bots[i];
                var latestMessageTime = bot.latest_message_time ? Date.parse(bot.latest_message_time) : 0;

                var oneDayInMilliseconds = 24 * 60 * 60 * 1000;
                var botIsCurrentlyActive = Date.now() < latestMessageTime + oneDayInMilliseconds;
                if (!botIsCurrentlyActive)
                    continue;

                // Sometimes (rarely), there are status messages with an empty bot name added to the database.
                if (!bot.bot_id.length)
                    bot.bot_id = "<empty name>";

                // FIXME: extract to a class.
                this._bots.push({
                    id: bot.bot_id,
                    statusPageURL: bot.status_page,
                    latestMessageTime: new Date(latestMessageTime),
                });
            }

            console.assert(this.statusPageURL === data.status_page);
            this._chartsPageURL = data.charts_page;

            this._loadedDetailedStatus = true;
            callback();
        }.bind(this));
    },
};