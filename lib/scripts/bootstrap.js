/*
 *
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 *
*/

(function (context) {
    // Replace navigator before any modules are required(), to ensure it happens as soon as possible.
    // We replace it so that properties that can't be clobbered can instead be overridden.
    function replaceNavigator(origNavigator) {
        var CordovaNavigator = function() {};
        CordovaNavigator.prototype = origNavigator;
        var newNavigator = new CordovaNavigator();
        // This work-around really only applies to new APIs that are newer than Function.bind.
        // Without it, APIs such as getGamepads() break.
        if (CordovaNavigator.bind) {
            for (var key in origNavigator) {
                if (typeof origNavigator[key] == 'function') {
                    newNavigator[key] = origNavigator[key].bind(origNavigator);
                }
            }
        }
        return newNavigator;
    }
    if (context.navigator) {
        context.navigator = replaceNavigator(context.navigator);
    }

    var channel = require("cordova/channel");

    // _nativeReady is global variable that the native side can set
    // to signify that the native code is ready. It is a global since
    // it may be called before any cordova JS is ready.
    if (window._nativeReady) {
        channel.onNativeReady.fire();
    }

    /**
     * Create all cordova objects once page has fully loaded and native side is ready.
     */
    var joinEvents = [ channel.onDOMContentLoaded, channel.onNativeReady ];

    // If this property is set to something truthy, join on onPluginsReady too.
    // This property is set by the automatic JS installation prototype in cordova-cli,
    // and will be removed when the prototype either becomes mainline or is dropped.
    if (window.__onPluginsLoadedHack) {
        joinEvents.push(channel.onPluginsReady);
    }

    channel.join(function() {
        var builder = require('cordova/builder'),
            platform = require('cordova/platform');

        builder.buildIntoButDoNotClobber(platform.defaults, context);
        builder.buildIntoAndClobber(platform.clobbers, context);
        builder.buildIntoAndMerge(platform.merges, context);

        // Call the platform-specific initialization
        platform.initialize();

        // Fire event to notify that all objects are created
        channel.onCordovaReady.fire();

        // Fire onDeviceReady event once all constructors have run and
        // cordova info has been received from native side.
        channel.join(function() {
            require('cordova').fireDocumentEvent('deviceready');
        }, channel.deviceReadyChannelsArray);

    }, joinEvents);

}(window));
