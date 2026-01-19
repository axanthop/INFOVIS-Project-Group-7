let mapVisInstance;
window.selectedMetrics="nbs_type";

Promise.all([d3.csv("./assets/data/cleaned.csv"), 
             d3.csv("./assets/data/coordinates.csv"),
             d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json")
]).then(([data, cities, world]) => {
    
    wholeData = data;
    filteredData = data;
    maxValuesRadar = computeRadarMaxValues(wholeData);
    
    mapVisInstance = new MapVis(
        "map-container",
        world,
        cities
    );

    mapVisInstance.updateVis(wholeData);
    
    // to show every project when open the page
    renderResults(wholeData);
    mapVisInstance.updateVis(wholeData);

    renderCountryOptions(wholeData);
    renderCityOptions(wholeData);
    renderStartYearOptions(wholeData);
    renderEndYearOptions(wholeData);
    initializeNbsAreaSlider(wholeData);
    renderPreviousAreaOptions(wholeData);
    renderNbsTypeOptions(wholeData);
    renderFundingOptions(wholeData);
    renderEnvironmentalImpactsOptions(wholeData);
    renderEconomicImpactsOptions(wholeData);
    initializeCostSlider(wholeData);

    renderCountryBarChart(wholeData);
    renderCountryBarChartMiniVersion(wholeData);
    renderCostHistogram(wholeData);
    renderCostHistogramMiniVersion(wholeData);
    renderTimeLine(wholeData);
    renderTimeLineMiniVersion(wholeData);

    // for the search bar part
    let searchBarInput = document.getElementById("search-input");

    searchBarInput.addEventListener("input", (e) => {
        filters.search = e.target.value.trim().toLowerCase();
        applyFilters();
    })

    // the overview panel containing the 3 mini/big charts
    document.querySelectorAll(".overview-card").forEach(card => {
        card.addEventListener("click", () => {
            let chartType = card.dataset.chart;
            openChartModal(chartType);
        });
    });

    document.getElementById("close-modal").addEventListener("click", () => {
        document.getElementById("chart-modal").classList.add("hidden");
    })


    // trigger the comparison procedure along with the bar containing the buttons compare and clear
    document.getElementById("compare-button").addEventListener("click", () => {
        let comparingProjects = wholeData.filter(d => 
            comparingSet.has(d.intervention_name)
        );
        renderComparisonView(comparingProjects);
        renderRadarChart(comparingProjects);
        showComparisonView();
    });

    document.getElementById("clear-compare").addEventListener("click", () => {
        comparingSet.clear();
        renderResults(filteredData || wholeData);
        updateCompareBar();
    })

});