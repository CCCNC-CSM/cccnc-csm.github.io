    class CsvUtilities {
        parseCsvLineToFields(csvLine, quoted = true, trimmed = true) {
            const regex = /"([^"]*(?:""[^"]*)*)"(?:,|$)|([^",]+)(?:,|$)|,/g;

            const fields = []
            if (quoted) {
                let match;
                while ((match = regex.exec(csvLine)) !== null) {
                    if (match[1] !== undefined) {
                        fields.push(match[1].replace(/""/g, '"'));  // escape double quote within double quote
                    } else if (match[2] !== undefined) {
                        fields.push(match[2]);
                    } else {
                        fields.push('');                            // empty field
                    }
                }
            } else {
                // Simple split on commas, no quote handling
                fields.push(csvLine.split(','));
            }

            return trimmed ? fields.map(header => header.trim()) : fields;
        }

        parseCSVTextToPojos(csvText, quoted = true) {
            const pojos = [];
            const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== '');
            const headerLine = lines[0];
            const headers = this.parseCsvLineToFields(headerLine, quoted);
            for (let index = 1; index < lines.length; index ++) {
                const line = lines[index];
                const row = this.parseCsvLineToFields(line);
                const pojo = {};
                headers.forEach((header, index) => {
                    pojo[header] = row[index] || ''; 
                });
                pojos.push(pojo);
            }

            return pojos;
        }
    }
    
    class ViewUtilties {
        renderFromTemplate(templateText, dataPojo) {
            return Mustache.render(templateText, dataPojo);
        }
    }

    class DataTableBuilder {
        constructor(rows) {
            this._rows = rows
            this._autoProperties = []
        }

        // yes, a show-off.
        static create(rows) {
            return new this(rows);
        }
        // newColumnValueFunction: function(row) { return row['column'] + value; }
        withAutoProperty(newColumnName, newColumnValueFunction) {
            this._autoProperties.push(row => row[newColumnName] = newColumnValueFunction.call(null, row));
            return this;
        }
        build() {
            this._rows.forEach(row => this._autoProperties.forEach(p => p.call(null, row)));
            return this._rows;
        }
    }

    class EventListingGrid {
        constructor() {
            this._viewRender = new ViewUtilties();
            this._csvUtils =  new CsvUtilities();
        }

        getMonthAbbreviation(isoDate) {
            const monthAbbrivation = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            const zeroIndexedMonth = new Date(isoDate).getMonth();
            return monthAbbrivation[zeroIndexedMonth];
        }
        getQuaterString(isoDate) {
            const monthAbbrivation = ["First", "Second", "Third", "Forth"];
            const zeroIndexedMonth = new Date(isoDate).getMonth();
            return monthAbbrivation[Math.floor(zeroIndexedMonth / 3)];
        }
        getYearTwoDigits(isoDate) {
            return String(new Date(isoDate).getFullYear() % 100);
        }
        getDayOfMonth(isoDate) {
            return new Date(isoDate).toISOString().slice(8, 10);
        }
        getDataFromCsvText(csvText) {
            const rows = this._csvUtils.parseCSVTextToPojos(csvText);
            return DataTableBuilder.create(rows)
                .withAutoProperty('quater', r => this.getQuaterString(r['isoDate']))
                .withAutoProperty('day', r => this.getDayOfMonth(r['isoDate']))
                .withAutoProperty('month', r => this.getMonthAbbreviation(r['isoDate']))
                .withAutoProperty('year', r => this.getYearTwoDigits(r['isoDate']))
                .build()
        }
        getFileKeyAndContentPromise(keyUrlMap) {
            const key = Object.keys(keyUrlMap)[0]
            const url = keyUrlMap[key]
            return fetch(url)
                        .then(response => {
                            if (response.ok) {
                                return response.text();
                            }
                            throw new Error(`Failed to file: ${response.statusText}`);
                        })
                        .then(content => ({key, content}))
        }
        bindAction(enclousingElement) {
            const SELECT_ALL_OPTIONS = "*";
            const ACTIVE_CLASS = "active";           // active and isotope-hidden are from isoTope
            const HIDDEN_CLASS = "hidden";   // should we break away from isoTope?
            const DATA_OPTION_ATTRIBUTE = "data-option-value";
            // override isoTope
            const hideElement = f => { f.classList.add(HIDDEN_CLASS); f.style.visibility = 'hidden'; f.style.display = 'none !important'; f.style.height = '0 !important'; } 
            const showElement = f => { f.classList.remove(HIDDEN_CLASS); f.style.visibility = 'visible'; f.style.display = 'block !important'; f.style.height = 'auto'; }

            // quiz: why is the proper way use nodeList instead of converting to array?
            const filterContainers = [...enclousingElement.querySelectorAll(".events-listing-header > ul.sort-source > li:has(a)")];
            const contentContainers = [...enclousingElement.querySelectorAll(".events-listing-content .event-list-item")];
            filterContainers.forEach(element => element.addEventListener('click', 
                e => {
                    const selectedClassOption = element.getAttribute(DATA_OPTION_ATTRIBUTE).replace(".","");
                    filterContainers.filter(f => f != element && f.classList.contains(ACTIVE_CLASS))
                        .forEach(f => f.classList.remove(ACTIVE_CLASS));
                    if (selectedClassOption != SELECT_ALL_OPTIONS) {
                        contentContainers.filter(f => !f.classList.contains(HIDDEN_CLASS) && !f.classList.contains(selectedClassOption))
                            .forEach(hideElement);
                        contentContainers.filter(f => f.classList.contains(selectedClassOption))
                            .forEach(showElement);
                    } else {
                        contentContainers.filter(f => f.classList.contains(HIDDEN_CLASS))
                            .forEach(showElement);
                    }
                    element.classList.add(ACTIVE_CLASS);
                }));
        }
        render(options) {
            const {targetElementQuerySelector, targetElement, dataurl, id, year, templatepath} = options;
            if (dataurl == null || year == null) {
                throw new Error(`options required: dataUrl (${dataurl}) and year (${year})`);
            }
            if (targetElementQuerySelector == null && targetElement == null) {
                throw new Error(`options required: targetElementQuerySelector (${targetElementQuerySelector}), targetElement (${targetElementQuerySelector})`);
            }

            const dataFileKey = "data";
            const templateFileKey = "template"
            const element = targetElement != null ? targetElement : document.querySelector(targetElementQuerySelector);
            const templatePath = templatepath != null ? templatepath : "/components/event-listing/event-listing.component.html";
            Promise.all([
                this.getFileKeyAndContentPromise({[dataFileKey]: dataurl}), 
                this.getFileKeyAndContentPromise({[templateFileKey]: templatePath})
            ])
            .then(results => {
                const fileKeyAndContent = {}
                results.forEach(({key, content}) => fileKeyAndContent[key] = content);
                return fileKeyAndContent
            })
           .then(fileKeyAndContent => {
                const htmlTemplate = fileKeyAndContent[templateFileKey];
                const dataContent = fileKeyAndContent[dataFileKey];
                const data = {
                    ...options,
                    rows: this.getDataFromCsvText(dataContent)
                }
                element.innerHTML = this._viewRender.renderFromTemplate(htmlTemplate, data);
                this.bindAction(element);
            });
        }
        static bindEventListings() {
            const eventListingGrid = new EventListingGrid();
            const selector = "data-cccnc-event-listing";
            const relatedPropertyPrefix = selector + "-";
            const targets = document.querySelectorAll(`[${selector}]`);
            targets.forEach(target => {
                const relatedProperties = {}
                for(const attribute of target.attributes) {
                    const attributeName = attribute.name;
                    const attributeValue = attribute.value;
                    if (attributeName.startsWith(relatedPropertyPrefix)) {
                        const propertyName = attributeName.substring(relatedPropertyPrefix.length).toLocaleLowerCase().replaceAll("-","")  // enforce being lower case
                        relatedProperties[propertyName] = attributeValue;
                    }
                }

                eventListingGrid.render({targetElement: target, ...relatedProperties});
            });
        }
    }

document.addEventListener("DOMContentLoaded", EventListingGrid.bindEventListings);
