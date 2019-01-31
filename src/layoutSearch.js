/* Copyright (c) 2012-2013 Casewise Systems Ltd (UK) - All rights reserved */
/*global cwAPI, jQuery*/

(function (cwApi, $) {
    'use strict';
    var cwLayoutSearch = function (options, viewSchema) {
        cwApi.extend(this, cwApi.cwLayouts.CwLayout, options, viewSchema);
        this.drawOneMethod = cwApi.cwLayouts.cwLayoutList.drawOne.bind(this);
        cwApi.registerLayoutForJSActions(this);
        this.errorMessages = [];
        this.javaScriptLoaded = false;
    };

    cwLayoutSearch.prototype.getContainerId = function () {
        return this.LayoutName + '-' + this.nodeID;
    };

    function getMetadataFromNode(node) {
        var i, pt, meta = {
            objectTypeScriptName: node.ObjectTypeScriptName,
            nodeId: node.NodeID,
            displayName: cwApi.mapToTranslation(node.NodeName),
            properties: []
        };
        for (i = 0; i < node.PropertiesSelected.length; i += 1) {
            pt = cwApi.mm.getProperty(node.ObjectTypeScriptName, node.PropertiesSelected[i]);
            meta.properties.push({
                displayName: pt.name,
                scriptName: pt.scriptName,
                isSelected: true
            });
        }
        return meta;
    }

    cwLayoutSearch.prototype.getDataFromJson = function (object, nodeId) {
        var i = 0, o;
        if (object.hasOwnProperty(nodeId)) {
            this.data[nodeId] = [];
            for (i = 0; i < object[nodeId].length; i += 1) {
                o = object[nodeId][i];
                o.displayName = this.getItemDisplayString(o);
                this.data[nodeId].push(o);
            }
        }
    };

    cwLayoutSearch.prototype.drawAssociations = function (output, associationTitleText, object) {
        var nodeId, o, i = 0, j = 0, n;
        this.data = {};
        this.mmData = [];
        this.mmDataById = {};
        try {
            var compNodes = this.options.CustomOptions['complementary-nodes'];
            if (compNodes !== '') {
                this.searchNodes = [this.nodeID].concat(JSON.parse(this.options.CustomOptions['complementary-nodes']));
            } else {
                this.searchNodes = [this.nodeID];
            }
        } catch (err) {
            console.error(err);
            this.errorMessages.push($.i18n('layoutsearch_setup_complementary_nodes'));
            return;
        }
        // set display name for each object
        for (i = 0; i < this.searchNodes.length; i += 1) {
            nodeId = this.searchNodes[i];
            if (this.viewSchema.NodesByID.hasOwnProperty(nodeId)) {
                n = getMetadataFromNode(this.viewSchema.NodesByID[nodeId]);
                this.mmData.push(n);
                this.mmDataById[n.nodeId] = n;
            }
            this.getDataFromJson(object.associations, nodeId);
        }

        output.push('<div class="cw-visible ', this.LayoutName, ' ', this.LayoutName, '-', this.nodeID, ' ', this.nodeID, '" id="', this.getContainerId(), '">');
        output.push('</div>');
    };

    cwLayoutSearch.prototype.getNodeDisplayString = function (nodeId) {
        var text = '';
        if (this.viewSchema.NodesByID.hasOwnProperty(nodeId)) {
            text = this.viewSchema.NodesByID[nodeId].NodeName;
        }
        return cwApi.mapToTranslation(text);
    };

    cwLayoutSearch.prototype.getItemDisplayString = function (item) {
        var layoutOptions, l, getDisplayStringFromLayout = function (layout) {
            return layout.getDisplayItem(item);
        };
        if (item.nodeID === this.nodeID) {
            return this.getDisplayItem(item);
        }
        if (cwApi.isUndefined(this.layoutsByNodeId)) {
            this.layoutsByNodeId = {};
        }
        if (!this.layoutsByNodeId.hasOwnProperty(item.nodeID)) {
            if (this.viewSchema.NodesByID.hasOwnProperty(item.nodeID)) {
                layoutOptions = this.viewSchema.NodesByID[item.nodeID].LayoutOptions;
                l = new cwApi.cwLayouts[item.layoutName](layoutOptions, this.viewSchema);
                l.hasTooltip = false;
                this.layoutsByNodeId[item.nodeID] = l;
            } else {
                return item.name;
            }
        }
        return getDisplayStringFromLayout(this.layoutsByNodeId[item.nodeID]);
    };

    cwLayoutSearch.prototype.getTemplatePath = function (folder, templateName) {
        return cwApi.format('{0}/html/{1}/{2}.ng.html', cwApi.getCommonContentPath(), folder, templateName);
    };

    cwLayoutSearch.prototype.applyJavaScript = function () {
        var that = this, i = 0;
        if (this.javaScriptLoaded) {
            return;
        }
        this.javaScriptLoaded = true;
        if (this.errorMessages.length > 0) {
            for (i = 0; i < this.errorMessages.length; i += 1) {
                cwApi.notificationManager.addError(this.errorMessages[i]);
            }
            return;
        }
        // load page
        cwApi.customLibs.aSyncLayoutLoader.loadUrls(['modules/elasticlunr/elasticlunr.min.js'], function (error) {
            if (error === null) {
                //search engine lib loaded. Create index
                var searchEngine = new cwApi.customLibs.cwLayoutSearch.searchEngine(that.mmData, that.data);
                cwApi.CwAsyncLoader.load('angular', function () {
                    var loader = cwApi.CwAngularLoader, templatePath, $container = $('#' + that.getContainerId());
                    loader.setup();
                    templatePath = that.getTemplatePath('Search', 'templateSearch');
                    loader.loadControllerWithTemplate('cwLayoutSearch', $container, templatePath, function ($scope, $sce, $http) {
                        $scope.containerId = that.nodeID;
                        $scope.scope = that.mmData;
                        $scope.mmDataById = that.mmDataById;
                        $scope.data = [];
                        $scope.searchValue = '';
                        $scope.options = {
                            isCollapsed: !hasBuildChanged(),
                            search: {
                                allWords: false,
                                exactMatch: false
                            }
                        };
                        $scope.isDisabled = false;

                        function disableInput() {
                            $scope.isDisabled = true;
                            $('body').css('cursor', 'progress');
                        }
                        function enableInput() {
                            $scope.isDisabled = false;
                            $('body').css('cursor', 'default');
                        }
                        function getResult() {
                            return searchEngine.searchItems($scope.searchValue, $scope.scope, $scope.options.search);
                        }
                        function hasBuildChanged() {
                            var json = JSON.parse(localStorage.getItem('cwLayoutSearch_' + that.nodeID));
                            if (!cwApi.isUndefinedOrNull(json)) {
                                var hasChanged = (json.buildVersion !== cwApi.cwConfigs.DeployNumber);
                                return hasChanged;
                            }
                            return true;
                        }
                        function doSearch() {
                            var i = 0, jsonFile = cwApi.getIndexViewDataUrl(that.viewSchema.ViewName);
                            disableInput();
                            $scope.data = [];
                            // reload data
                            $http.get(jsonFile).then(function (o) {
                                if (cwApi.checkJsonCallback(o)) {
                                    that.data = {};
                                    for (i = 0; i < that.searchNodes.length; i += 1) {
                                        that.getDataFromJson(o.data, that.searchNodes[i]);
                                    }
                                    searchEngine.reloadData(that.data);
                                    $scope.data = getResult();
                                    $scope.data.forEach(function (currentValue, index, arr) {
                                        currentValue.hasResult = currentValue.items.length > 0 ? true : false;
                                        currentValue.isDisplayed = currentValue.items.length > 0 ? true : false;
                                    });
                                    enableInput();
                                    cwApi.tmpSearch = $scope;
                                }
                            }, cwApi.errorOnLoadPage);
                        }
                        $scope.toggleOptions = function () {
                            $scope.options.isCollapsed = !$scope.options.isCollapsed;
                        };
                        $scope.toggleResultNode = function (rNode) {
                            rNode.isDisplayed = !rNode.isDisplayed;
                        };
                        $scope.saveOptions = function () {
                            localStorage.setItem('cwLayoutSearch_' + that.nodeID, JSON.stringify({ buildVersion: cwApi.cwConfigs.DeployNumber, opt: $scope.options.search, scope: $scope.scope }));
                            cwApi.notificationManager.addNotification($.i18n.prop('layoutsearch_options_zone_save'));
                        };
                        $scope.setOptionsFromLocalStorage = function () {
                            var json = JSON.parse(localStorage.getItem('cwLayoutSearch_' + that.nodeID));
                            if (!cwApi.isUndefinedOrNull(json) && cwApi.cwConfigs.DeployNumber === json.buildVersion) {
                                $scope.options.search.allWords = json.opt.allWords;
                                $scope.options.search.exactMatch = json.opt.exactMatch;
                                $scope.scope = json.scope;
                            }
                        };
                        $scope.setOptionsFromConfiguration = function () {
                            var i = 0, j, node, propertiesScriptName, scopeJson = that.options.CustomOptions['search-scope'];
                            $scope.options.search.exactMatch = that.options.CustomOptions['search-exact-match'];
                            $scope.options.search.allWords = that.options.CustomOptions['search-all-words'];
                            if (scopeJson !== '') {
                                try {
                                    scopeJson = JSON.parse(scopeJson);
                                } catch (err) {
                                    console.error(err);
                                    return;
                                }
                                for (i = 0; i < $scope.scope.length; i += 1) {
                                    node = $scope.scope[i];
                                    if (scopeJson.hasOwnProperty(node.nodeId)) {
                                        propertiesScriptName = scopeJson[node.nodeId].map(function (p) {
                                            return p.toLowerCase();
                                        });
                                        for (j = 0; j < node.properties.length; j += 1) {
                                            if (propertiesScriptName.indexOf(node.properties[j].scriptName.toLowerCase()) === -1) {
                                                node.properties[j].isSelected = false;
                                            }
                                        }
                                    } else {
                                        for (j = 0; j < node.properties.length; j += 1) {
                                            node.properties[j].isSelected = false;
                                        }
                                    }
                                }
                            }
                        };
                        $scope.keypressSearch = function (e) {
                            var key = e.which || e.keyCode || 0;
                            if (key === 13) { // press enter
                                doSearch();
                            }
                        };
                        $scope.clickSearch = function () {
                            doSearch();
                        };

                        $scope.displayItemString = function (item) {
                            return $sce.trustAsHtml(item.doc._displayName);
                        };

                        // set option & scope from configuration
                        $scope.setOptionsFromConfiguration();
                        // set option & scope from localstorage
                        $scope.setOptionsFromLocalStorage();
                        // get query string
                        var qs = cwApi.getQueryStringObject();
                        if (!cwApi.isUndefinedOrNull(qs) && !cwApi.isUndefinedOrNull(qs.searchq)) {
                            $scope.searchValue = qs.searchq;
                            doSearch();
                        }

                    });
                });
            } else {
                cwApi.Log.Error(error);
            }
        });
    };

    cwApi.cwLayouts.cwLayoutSearch = cwLayoutSearch;

}(cwAPI, jQuery));