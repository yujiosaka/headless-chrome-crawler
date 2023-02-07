const JSONLineExporter = require('headless-chrome-crawler/exporter/json-line');
const _ = require('lodash');

class CookieExporter extends JSONLineExporter {
	constructor(settings) {
	    super(settings);
	    this.lines = [];
	}

	writeLine(result) {
	    if (this._settings.fields) this.lines.push(_.pick(result, this._settings.fields));
	}

	writeHeader() {
	    // Do nothing
	}

	writeFooter() {
	    var urls = [];
	    var table = [];
	    var tableGroup = [];
	    var tableDomain = [];

	    var tree = [];
	    var childrenOf = {};

	    for(var i = 0, length = this.lines.length; i < length; i++) {
			var item = this.lines[i];
			urls.push({ index: i, url: item.url });

			_.forEach(item.cookies, function(elem) {
				// Table
				processCookie(elem, table, i, true);
				// Table Grouped
				processCookie({ name: elem.name, value: elem.value }, tableGroup, i, false);
				// Table Domain
				var urlDomain = extractHostname(item.url);
                var domainEntry = _.find(tableDomain, function(entry) { return entry.domain == urlDomain });
                if (!domainEntry) {
                    tableDomain.push({ domain: urlDomain, cookieNames: [elem.name], urls: [i] });
                } else {
                    domainEntry.cookieNames.indexOf(elem.name) === -1 ? domainEntry.cookieNames.push(elem.name) : undefined;
                    domainEntry.urls.indexOf(i) === -1 ? domainEntry.urls.push(i) : undefined;
                }
			});

			var parentId = null;
			var url = _.find(urls, function(elem) { return elem.url == item.previousUrl });
			if (url) {
				parentId = url.index;
			}

			item.url = i;
			item.previousUrl = parentId;
			item.numberOfCookies = item.cookies.length;
			// Reduce output size
			item.cookies = [];

			childrenOf[i] = childrenOf[i] || [];
			item.children = childrenOf[i];

			if (parentId != null) {
				childrenOf[parentId] = childrenOf[parentId] || [];
				childrenOf[parentId].push(item);
			} else {
				tree.push(item);
			}
	    }

	    var output = {};
	    output.urls = urls;
	    output.table = table;
	    output.tableGroup = tableGroup;
	    output.tableDomain = tableDomain;
	    output.tree = tree;
	    this._stream.write(JSON.stringify(output));

	    function processCookie(cookie, table, index, allFields) {
			var cookieFound;
			if (allFields) {
				cookieFound = _.find(table, function(elem) {
				                    var c = elem.cookie;
				                    return cookie.name === c.name && cookie.value === c.value && cookie.domain === c.domain &&
				                        cookie.path === c.path && cookie.expires === c.expires && cookie.size === c.size &&
				                        cookie.httpOnly === c.httpOnly && cookie.secure === c.secure && cookie.session === c.session;
				                });
			} else {
				cookieFound = _.find(table, function(elem) {
				                    var c = elem.cookie;
				                    return cookie.name === c.name && cookie.value === c.value;
				                });
			}

			if (!cookieFound) {
				table.push({ urls: [index], cookie: cookie });
			} else {
				cookieFound.urls.push(index);
			}
	    }

        // https://stackoverflow.com/a/23945027
	    function extractHostname(url) {
            var hostname;
            //find & remove protocol (http, ftp, etc.) and get hostname

            if (url.indexOf("//") > -1) {
                hostname = url.split('/')[2];
            }
            else {
                hostname = url.split('/')[0];
            }

            //find & remove port number
            hostname = hostname.split(':')[0];
            //find & remove "?"
            hostname = hostname.split('?')[0];

            return hostname;
        }
	}
}

module.exports = CookieExporter;
