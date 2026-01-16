
// we use window to make the variables global
// so every file can read them
window.filters = {
    countries: new Set(),
    cities: new Set(),
    startYear: null,
    endYear: null,
    nbsArea: [null, null],
    previousArea: new Set(),
    nbsType: new Set(),
    totalCost: [null, null],
    funding: new Set(),
    envImpacts: new Set(),
    econImpacts: new Set(),
    search: ""
};

// comparing procedure
window.comparingSet = new Set();

window.wholeData = [];
window.filteredData = [];
// for the radar chart
window.radarMaxValues = null;