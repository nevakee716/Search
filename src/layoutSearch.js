/* Copyright (c) 2012-2013 Casewise Systems Ltd (UK) - All rights reserved */
/*global cwAPI, jQuery*/

(function (cwApi, $) {


  var color = [{
    "color": "#0094dc",
    "background-color": "#e1f5ff"
  },{
    "color": "#13d613",
    "background-color": "#ddffdd"
  },{
    "color": "#fd6c00",
    "background-color": "#fef0e5"
  }];




  "use strict";
  var cwLayoutSearch = function (options, viewSchema) {
    cwApi.extend(this, cwApi.cwLayouts.CwLayout, options, viewSchema);
    this.drawOneMethod = cwApi.cwLayouts.cwLayoutList.drawOne.bind(this);
    cwApi.registerLayoutForJSActions(this);
    this.errorMessages = [];
    this.javaScriptLoaded = false;
    this.directiveId = 500;
  };

  var loader = cwApi.CwAngularLoader;
  if (cwApi.ngDirectives) {
    cwApi.ngDirectives.push(function () {
      loader.registerDirective("elemReady", function ($parse) {
        return {
          restrict: "A",
          link: function ($scope, elem, attrs) {
            $timeout(function () {
              elem.ready(function () {
                $scope.$apply(function () {
                  var func = $parse(attrs.elemReady);
                  func($scope);
                });
              });
            });
          },
        };
      });
    });
  }

  cwLayoutSearch.prototype.getContainerId = function () {
    return this.LayoutName + "-" + this.nodeID;
  };

  function getMetadataFromNode(node) {
    var i,
      pt,
      meta = {
        objectTypeScriptName: node.ObjectTypeScriptName,
        nodeId: node.NodeID,
        displayName: cwApi.mapToTranslation(node.NodeName),
        properties: [],
      };
    for (i = 0; i < node.PropertiesSelected.length; i += 1) {
      pt = cwApi.mm.getProperty(node.ObjectTypeScriptName, node.PropertiesSelected[i]);
      meta.properties.push({
        displayName: pt.name,
        scriptName: pt.scriptName,
        isSelected: ["String", "Memo", "Lookup"].indexOf(pt.type) !== -1,
      });
    }
    return meta;
  }

  cwLayoutSearch.prototype.getDataFromJson = function (object, nodeId) {
    var i = 0,
      o;
    if (object.hasOwnProperty(nodeId)) {
      this.data[nodeId] = [];
      for (i = 0; i < object[nodeId].length; i += 1) {
        o = object[nodeId][i];
        o.displayName = cwAPI.customLibs.utils.getItemDisplayString(this.viewSchema.ViewName, o);
        
        o.niceList = {};
        if (cwAPI.customLibs.utils.isObjectFavorite(o.objectTypeScriptName, o.object_id)) {
          o.niceList.setAsFav = true;
        } else {
          o.niceList.setAsFav = false;
        }
        o.niceList.tagProperties = [];
        Object.keys(o.properties).filter(function(p) {
          return ['name'].indexOf(p) === -1 && ['exportflag'].indexOf(p) === -1 && p.indexOf("_id") === -1 && p.indexOf("_abbreviation") === -1 && ['cwaveragerating'].indexOf(p) === -1 && ['cwtotalcomment'].indexOf(p) === -1;
        }).forEach(function(ps){
        
          let property = cwAPI.mm.getProperty(o.objectTypeScriptName,ps);
          if(property.type === "Memo") return;
          if(property.type === "URL") {
            o.niceList.urlPropertiesScriptname = ps;
            o.niceList.url = o.properties[ps]
          }
          else if(property.type === "Date") {
            o.niceList.datePropertiesScriptname = ps;
            o.niceList.date = o.properties[o.niceList.datePropertiesScriptname]
          } else {
            o.niceList.tagProperties.push(o.properties[ps]);
          }
        })
        let config = cwAPI.customLibs.utils.getCustomLayoutConfiguration("cdsEnhanced");
        if (config) {
          if (config.displayPopoutByDefault) {
      
            let popOutName = cwApi.replaceSpecialCharacters(o.objectTypeScriptName) + "_diagram_popout";
            if (cwAPI.ViewSchemaManager.pageExists(popOutName) === true) {
              o.niceList.popout = {id:o.object_id,name:popOutName};
            }
          }
        }
        o.niceList.associationsIcon = [];
        o.niceList.associations = [];
        Object.keys(o.associations).forEach(function(k){
          if(k.indexOf("_icon") !== -1){
            o.niceList.associationsIcon.push(o.associations[k]);
          } else {
            o.niceList.associations.push(o.associations[k]);
          }
        })

        let options = { year: "numeric", month: "long", day: "numeric" };
    
        if(o.niceList.datePropertiesScriptname) {
          let lDate = new Date(o.niceList.date);
          o.niceList.lDate = lDate.toLocaleDateString(undefined, options);
        }


        var div = document.createElement("div");
        div.innerHTML = o.displayName;
        o.sort = div.textContent || div.innerText || "";
        this.data[nodeId].push(o);
      }
    }
  };

  cwLayoutSearch.prototype.drawAssociations = function (output, associationTitleText, object) {
    var nodeId,
      o,
      i = 0,
      j = 0,
      n;
    this.data = {};
    this.mmData = [];
    this.mmDataById = {};
    try {
      var compNodes = this.options.CustomOptions["complementary-nodes"];
      if (compNodes !== "") {
        this.searchNodes = [this.nodeID].concat(JSON.parse(this.options.CustomOptions["complementary-nodes"]));
      } else {
        this.searchNodes = [this.nodeID];
      }
    } catch (e) {
      try {
        this.searchNodes = [this.nodeID].concat(this.options.CustomOptions["complementary-nodes"].split(","));
      } catch (err) {
        console.error(err);
        this.errorMessages.push($.i18n("layoutsearch_setup_complementary_nodes"));
        return;
      }
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

    output.push(
      '<div class="cw-visible ',
      this.LayoutName,
      " ",
      this.LayoutName,
      "-",
      this.nodeID,
      " ",
      this.nodeID,
      '" id="',
      this.getContainerId(),
      '">'
    );
    output.push("</div>");
  };

  cwLayoutSearch.prototype.getNodeDisplayString = function (nodeId) {
    var text = "";
    if (this.viewSchema.NodesByID.hasOwnProperty(nodeId)) {
      text = this.viewSchema.NodesByID[nodeId].NodeName;
    }
    return cwApi.mapToTranslation(text);
  };

  cwLayoutSearch.prototype.getTemplatePath = function (folder, templateName) {
    return cwApi.format("{0}/html/{1}/{2}.ng.html", cwApi.getCommonContentPath(), folder, templateName);
  };

  cwLayoutSearch.prototype.applyJavaScript = function () {
    var self = this,
      i = 0;
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
    cwApi.customLibs.aSyncLayoutLoader.loadUrls(["modules/elasticlunr/elasticlunr.min.js"], function (error) {
      if (error === null) {
        //search engine lib loaded. Create index
        var searchEngine = new cwApi.customLibs.cwLayoutSearch.searchEngine(self.mmData, self.data, self.options.CustomOptions["search-halfword"]);
        cwApi.CwAsyncLoader.load("angular", function () {
          var loader = cwApi.CwAngularLoader,
            templatePath,
            $container = $("#" + self.getContainerId());
          loader.setup();
          templatePath = self.getTemplatePath("Search", "templateSearch");
          loader.loadControllerWithTemplate("cwLayoutSearch", $container, templatePath, function ($scope, $sce, $http) {
            $scope.ng = {};
            $scope.containerId = self.nodeID;
            $scope.scope = self.mmData;
            $scope.mmDataById = self.mmDataById;
            $scope.data = [];
            $scope.ng.searchValue = "";
            $scope.elementPerPage = 15;
            $scope.Math = window.Math;
            $scope.options = {
              isExpanded: hasBuildChanged(),
              search: {
                allWords: false,
                exactMatch: false,
              },
            };
            $scope.topBar = true;
            $scope.url = "";
            $scope.isDisabled = false;

            function disableInput() {
              $scope.isDisabled = true;
              $("body").css("cursor", "progress");
            }
            function enableInput() {
              $scope.isDisabled = false;
              $("body").css("cursor", "default");
            }
            function getResult() {
              return searchEngine.searchItems($scope.ng.searchValue, $scope.scope, $scope.options.search);
            }
            function hasBuildChanged() {
              var json = JSON.parse(localStorage.getItem("cwLayoutSearch_" + self.nodeID));
              if (!cwApi.isUndefinedOrNull(json)) {
                var hasChanged = json.buildVersion !== cwApi.cwConfigs.DeployNumber;
                return hasChanged;
              }
              return true;
            }
            function doSearch() {
              disableInput();
              $scope.data = [];
              // reload data (why)

              if ($scope.url) {
                localStorage.setItem("cwLayoutSearch_searchtext_from_home", $scope.ng.searchValue);
                window.location.href = $scope.url;
              } else {
                localStorage.setItem("cwLayoutSearch_searchtext" + self.nodeID, $scope.ng.searchValue);
              }

              $scope.operators = ["=", "!=", ">", "<", "In"];
              $scope.data = getResult();
              $scope.data.forEach(function (currentValue, index, arr) {
                currentValue.hasResult = currentValue.items.length > 0 ? true : false;
                currentValue.isDisplayed = currentValue.items.length > 0 ? true : false;
                currentValue.directive = $scope.containDirective(currentValue.nodeId) ? $scope.getDirective(currentValue) : null;
                currentValue.objectTypeScriptname = $scope.getObjectTypeScriptnameFromNodeId(currentValue);
                currentValue.extended = false;
                currentValue.displayFilter = false;
                try {
                  currentValue.filters = JSON.parse(localStorage.getItem("psgGlobalSeach_" + currentValue.nodeId + "_" + cwApi.getDeployNumber()));
                } catch (e) {}
                if (!currentValue.filters) currentValue.filters = [];

                $scope.applyFilters(currentValue);
                currentValue.title = self.viewSchema.NodesByID[currentValue.nodeId].NodeName;
                currentValue.propertiesSelected = self.viewSchema.NodesByID[currentValue.nodeId].PropertiesSelected.map(function (ps) {
                  return cwApi.mm.getProperty(currentValue.objectTypeScriptname, ps);
                });
                currentValue.totalPages = Math.ceil(currentValue.items.length / $scope.elementPerPage);
              });
              enableInput();
              cwApi.tmpSearch = $scope;
            }
            $scope.ng.showOption = self.options.CustomOptions["searchOption"];
            $scope.cwApi = cwApi;
            $scope.toggleOptions = function () {
              $scope.options.isExpanded = !$scope.options.isExpanded;
            };
            $scope.toggleResultNode = function (rNode) {
              rNode.isDisplayed = !rNode.isDisplayed;
            };
            $scope.cleanUrl = function (url) {
              return url.replace("<a href='", "").split("'>")[0];
            };
            $scope.isFav = function (objectTypeScriptName, object_id) {
              return cwAPI.customLibs.utils.isObjectFavorite(objectTypeScriptName.toLowerCase(), object_id);
            };
            $scope.addAsFav = function (objectTypeScriptName, object_id) {
              cwAPI.customLibs.utils.addObjectAsFavorite(objectTypeScriptName.toLowerCase(), object_id, function () {
                $scope.$apply();
              });
            };

            $scope.removeAsFav = function (objectTypeScriptName, object_id) {
              cwAPI.customLibs.utils.removeObjectAsFavorite(objectTypeScriptName.toLowerCase(), object_id, function () {
                $scope.$apply();
              });
            };

            $scope.getPageValue = function (page, x) {
              let r;
              if (page > x.totalPages) return null;
              if (x.totalPages < 6) return page;
              r = x.pageNumber - 3 + page;
              r = Math.max(r, page);
              r = Math.min(x.totalPages - 5 + page, r);
              return r;
            };

            $scope.saveOptions = function () {
              localStorage.setItem(
                "cwLayoutSearch_" + self.nodeID,
                JSON.stringify({ buildVersion: cwApi.cwConfigs.DeployNumber, opt: $scope.options.search, scope: $scope.scope })
              );
              cwApi.notificationManager.addNotification($.i18n.prop("layoutsearch_options_zone_save"));
            };
            $scope.setOptionsFromLocalStorage = function () {
              var json = JSON.parse(localStorage.getItem("cwLayoutSearch_" + self.nodeID));
              if (!cwApi.isUndefinedOrNull(json) && cwApi.cwConfigs.DeployNumber === json.buildVersion) {
                $scope.options.search.allWords = json.opt.allWords;
                $scope.options.search.exactMatch = json.opt.exactMatch;
                $scope.scope = json.scope;
              }
            };
            $scope.addFilter = function (x) {
              $scope.filters.push({});
            };
            $scope.removeFilter = function (x, index) {
              x.filters.splice(index, 1);
            };
            $scope.resetFilter = function (filter) {
              filter.Operator = "";
              filter.Value = "";
            };
            $scope.applyFilters = function (x) {
              localStorage.setItem("psgGlobalSeach_" + x.nodeId + "_" + cwApi.getDeployNumber(), angular.toJson(x.filters));
              if (!x.filters) {
                x.filteredItems = x.items;
                return;
              }
              let f = new cwAPI.customLibs.utils.cwFilter(x.objectTypeScriptname);
              f.init(x.filters);
              x.filteredItems = x.items.filter(function (item) {
                item.properties = item.doc;
                return f.isMatching(item);
              });
            };

            $scope.setOptionsFromConfiguration = function () {
              var i = 0,
                scopeJson = self.options.CustomOptions["search-scope"];
              $scope.topbar = self.options.CustomOptions["top-bar"];
              $scope.url = self.options.CustomOptions["url"];
              $scope.options.search.exactMatch = self.options.CustomOptions["search-exact-match"];
              $scope.options.search.allWords = self.options.CustomOptions["search-all-words"];
              if (scopeJson !== "") {
                try {
                  scopeJson = JSON.parse(scopeJson);
                } catch (err) {
                  console.error(err);
                  return;
                }
                for (i = 0; i < $scope.scope.length; i += 1) {
                  let nodeScope = $scope.scope[i];
                  nodeScope.properties.forEach(function (propertyScope, indexPropScope) {
                    propertyScope.isSelected = scopeJson.some(function (group) {
                      return group.nodes.some(function (node) {
                        if (node.nodeId !== nodeScope.nodeId) return false;
                        node.index = i;
                        node.label = nodeScope.displayName;
                        return node.properties.some(function (prop) {
                          if (propertyScope.scriptName !== prop.scriptname) return false;
                          prop.index = indexPropScope;
                          prop.label = propertyScope.displayName;
                          return prop.selected;
                        });
                      });
                    });
                  });
                }
                $scope.scopeJson = scopeJson;
              }
            };
            $scope.dataHasResult = function (n) {
              return $scope.data.some(function (d) {
                return d.hasResult;
              });
            };
            $scope.keypressSearch = function (e) {
              doSearch();
            };
            $scope.clickSearch = function () {
              doSearch();
            };
            $scope.containDirective = function (nodeId) {
              let cds = self.viewSchema.NodesByID[nodeId].LayoutOptions.DisplayPropertyScriptName;
              return cds.indexOf("ngDirective") !== -1;
            };
            $scope.getDirective = function (x) {
              let nodeId = x.nodeId;
              let cds = self.viewSchema.NodesByID[nodeId].LayoutOptions.DisplayPropertyScriptName;
              return cds.replace("ngDirective:", "");
            };
            $scope.getObjectTypeScriptnameFromNodeId = function (x) {
              let nodeId = x.nodeId;
              return self.viewSchema.NodesByID[nodeId].ObjectTypeScriptName;
            };

            $scope.displayItemString = function (item) {
              return $sce.trustAsHtml(item.doc._displayName);
            };

            $scope.color = color;
            $scope.addAsFavourite = function (item,ots) {
              item.doc._niceList.setAsFav = true;
              cwAPI.customLibs.utils.addObjectAsFavorite(ots, item.doc._id);
            };

            $scope.removeAsFavourite = function (item,ots) {
              item.doc._niceList.setAsFav = false;
              cwAPI.customLibs.utils.removeObjectAsFavorite(ots, item.doc._id);
            };



            // set option & scope from configuration
            $scope.setOptionsFromConfiguration();
            // set option & scope from localstorage
            $scope.setOptionsFromLocalStorage();
            // get query string
            if ($scope.url === "") {
              let searchText = localStorage.getItem("cwLayoutSearch_searchtext_from_home");
              if (!searchText) searchText = localStorage.getItem("cwLayoutSearch_searchtext" + self.nodeID);
              else localStorage.removeItem("cwLayoutSearch_searchtext_from_home");
              $scope.ng.searchValue = searchText;

              if ($scope.ng.searchValue) doSearch();
            }
          });
        });
      } else {
        cwApi.Log.Error(error);
      }
    });
  };

  cwApi.cwLayouts.cwLayoutSearch = cwLayoutSearch;
})(cwAPI, jQuery);
