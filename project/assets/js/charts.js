
// radar chart functions
function radarData(projects) {
    return projects.map(p => ({
        name: p.intervention_name,
        values: [
            {axis: "NbS Area (m2)", value: +p.nbs_area},
            {axis: "Total Cost (€)", value: +p.total_cost},
            {axis: "Duration", value: +p.end_year - +p.begin_year},
            // {axis: "Environmental Impacts", value: +p.environmental_impacts?.split(";").length || 0},
            // {axis: "Economic Impacts", value: +p.economic_impacts?.split(";").length || 0}
        ]
    }));
}

function computeRadarMaxValues(data) {
    return {
        "NbS Area (m2)": d3.max(data, d => +d.nbs_area || 0) * 1.1,
        // "Total Cost (€)": d3.max(data, d => +d.total_cost || 0) * 1.1,
        "Duration": d3.max(data, d => (+d.end_year - +d.begin_year) || 0) * 1.1,

        // because total_cost has very large numbers in comparison with the other two features
        // we normilize the value of total_cost so it can be shown better in the visualization
        "Total Cost (€)": Math.log10(d3.max(data, d => +d.total_cost || 1)) * 1.1
    };
}

function changeDataForRadar(data) {
    data.forEach(d => {
        d.values.forEach(v => {
            let value = v.value;
            if (v.axis === "Total Cost (€)") {
                value = Math.log10(Math.max(value, 1));
            }
            let max = maxValuesRadar[v.axis] || 1;
            v.newValues = value/max;
        });
    });
    return data;
}

function renderRadarChart(projects) {
    let svg = d3.select("#radar-chart");
    // to remove all content regarding svg
    svg.selectAll("*").remove();

    let width = 450;
    let height = 450;
    let radius = Math.min(width, height)/2-50;

    svg.attr("viewBox", `0 0 ${width} ${height}`);

    let g = svg.append("g").attr("transform", `translate(${width/2}, ${height/2})`);

    let data = changeDataForRadar(radarData(projects));
    let axes = data[0].values.map(d => d.axis);
    let angleS = (Math.PI * 2)/axes.length;
    let rScale = d3.scaleLinear().domain([0, 1]).range([0, radius]);

    let levels = 5;
    for (let i=1; i<=levels; i++) {
        g.append("circle")
                .attr("r", (radius/levels)*i)
                .attr("fill", "none")
                .attr("stroke", "#ddd");
    }

    let axisGroup = g.selectAll(".radar-axis")
                        .data(axes)
                        .enter()
                        .append("g")
                        .attr("class", "radar-axis");

    axisGroup.append("line")
                    .attr("x1", 0)
                    .attr("y1", 0)
                    .attr("x2", (d, i) => rScale(1)*Math.cos(angleS*i-Math.PI/2))
                    .attr("y2", (d, i) => rScale(1)*Math.sin(angleS*i-Math.PI/2));

    axisGroup.append("text")
                    .attr("x", (d, i) => rScale(1)*Math.cos(angleS*i-Math.PI/2))
                    .attr("y", (d, i) => rScale(1)*Math.sin(angleS*i-Math.PI/2))
                    .style("text-anchor", "middle")
                    .text(d => d);

    let rLine = d3.lineRadial()
                        .radius(d => rScale(d.newValues))
                        .angle((d, i) => i * angleS)
                        .curve(d3.curveLinearClosed);

    let color = d3.scaleOrdinal(d3.schemeCategory10);

    g.selectAll(".radar-area")
                    .data(data)
                    .enter()
                    .append("path")
                    .attr("class", "radar-area")
                    .attr("d", d => rLine(d.values))
                    .attr("fill", (d, i) => color(i))
                    .attr("stroke", (d, i) => color(i));

    data.forEach((d, i) => {
        g.selectAll(`.radar-dot-${i}`)
                            .data(d.values)
                            .enter()
                            .append("circle")
                            .attr("class", "radar-dot")
                            .attr("cx", (v, idx) =>
                                rScale(v.newValues) * Math.cos(angleS*idx-Math.PI/2))
                            .attr("cy", (v, idx) => 
                                rScale(v.newValues) * Math.sin(angleS*idx-Math.PI/2))
                            .attr("fill", color(i));
    });

    let legendGroup = svg.append("g")
                            .attr("class", "radar-legend")
                            .attr("transform", `translate(${width-160}, 40)`);
    let legendHeight = 20;

    let legend = legendGroup.selectAll(".legend-item")
                            .data(data)
                            .enter()
                            .append("g")
                            .attr("class", "legend-item")
                            .attr("transform", (d, i) => `translate(0, ${i*legendHeight})`);
    
    legend.append("rect")
                    .attr("width", 12)
                    .attr("height", 12)
                    .attr("y", -10)
                    .attr("fill", (d, i) => color(i))
                    .attr("stroke", (d, i) => color(i));
    
    // legend for the project name
    legend.append("text")
                    .attr("x", 18)
                    .attr("y", 0)
                    .attr("dy", "-0.2em")
                    .style("font-size", "12px")
                    .style("alignment-baseline", "middle")
                    .text(d => d.name.length > 25 ? d.name.slice(0,25) + "...": d.name);
}


// set up for the bar chart
function overviewProjectsCountry(data, topCountries = 15) {
    summed = d3.rollups(data, v => v.length, d => d.country || "Unknown")
                        .map(([country, count]) => ({ country, count })).sort((a,b) => b.count - a.count);

    if (summed.length <= topCountries) return summed;

    let topC = summed.slice(0, topCountries);
    let otherCountries = summed.slice(topCountries);
    let otherCountriesCount = d3.sum(otherCountries, d => d.count);

    topC.push({
        country: "Other",
        count: otherCountriesCount,
        isOther: true
    });

    return topC;
                    
}

function renderCountryBarChartMiniVersion(data) {
    let svg = d3.select("#country-bar-chart-mini");
    // to remove all content regarding svg
    svg.selectAll("*").remove();

    let margin = {top: 5, right: 5, bottom: 25, left: 5};
    let width = 300 - margin.left - margin.right;
    let height = 90 - margin.top - margin.bottom;

    svg.attr("viewBox", `0 0 300 90`);

    let g = svg.append("g")
                    .attr("transform", `translate(${margin.left},${margin.top})`);

    let sumOfCountryMini = overviewProjectsCountry(data, 6);

    let x = d3.scaleBand()
                    .domain(sumOfCountryMini.map(d => d.country))
                    .range([0, width])
                    .padding(0.3);

    let y = d3.scaleLinear()
                    .domain([0, d3.max(sumOfCountryMini, d => d.count)])
                    .range([height, 0]);


    svg.selectAll("rect")
                .data(sumOfCountryMini)
                .enter()
                .append("rect")
                .attr("x", d => x(d.country))
                .attr("y", d => y(d.count))
                .attr("width", x.bandwidth())
                .attr("height", d => height - y(d.count))
                .attr("fill", "#69b3a2");

    g.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(x).tickSize(0))
            .selectAll("text")
            .attr("font-size", "9px")
            .attr("transform", "rotate(-40)")
            .style("text-anchor", "end");

}

function openChartModal(type) {
    document.getElementById("chart-modal").classList.remove("hidden");

    if (type === "country") {
        renderCountryBarChart(filteredData, "#chart-modal-svg");
    }

    if (type === "cost") {
        renderCostHistogram(filteredData, "#chart-modal-svg");
    }

    if (type === "year") {
        renderTimeLine(filteredData, "#chart-modal-svg");
    }
}

function renderCountryBarChart(data, svgSelector = "#country-bar-chart") {
    let svg = d3.select(svgSelector);
    // to remove all content regarding svg
    svg.selectAll("*").remove();

    let margin = {top: 20, right: 20, bottom: 80, left: 50};
    let width = 500 - margin.left - margin.right;
    let height = 300 - margin.top - margin.bottom;

    svg.attr("viewBox", `0 0 500 300`);

    let g = svg.append("g")
                    .attr("transform", `translate(${margin.left},${margin.top})`);

    let sumOfCountry = overviewProjectsCountry(data, 15);

    let x = d3.scaleBand()
                    .domain(sumOfCountry.map(d => d.country))
                    .range([0, width])
                    .padding(0.2);

    let y = d3.scaleLinear()
                    .domain([0, d3.max(sumOfCountry, d => d.count)])
                    .nice()
                    .range([height, 0]);

    g.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(x))
            .selectAll("text")
            .attr("transform", "rotate(-45)")
            .style("text-anchor", "end");

    g.append("g").call(d3.axisLeft(y));

    g.selectAll(".bar")
                .data(sumOfCountry)
                .enter()
                .append("rect")
                .attr("class", "bar")
                .attr("x", d => x(d.country))
                .attr("y", d => y(d.count))
                .attr("width", x.bandwidth())
                .attr("height", d => height - y(d.count))
                .attr("fill", d => filters.countries.has(d.country) ? "#949ba7" : "#69b3a2")
                .style("cursor", "pointer")
                .on("click", (event, d) => {
                    if (d.isOther) return;
                    moveCountryFromChart(d.country);
                });

}

function moveCountryFromChart(country) {
    if (filters.countries.has(country)) {
        filters.countries.delete(country);
        document.querySelectorAll(`#country-options input[value="${country}"]`).forEach(cb => cb.checked = false);
    } else {
        filters.countries.add(country);
        document.querySelectorAll(`#country-options input[value="${country}"]`).forEach(cb => cb.checked = true);
    }

    countryFilter.classList.toggle("active", filters.countries.size > 0);
    applyFilters();
}



// setting up the histogram part
function settingUpCostHistogram(data, count = 10) {
    let values = data.map(d => +d.total_cost).filter(v => !isNaN(v) && v > 0);

    if (values.length === 0) return [];

    let x = d3.scaleLinear()
                    .domain(d3.extent(values))
                    .nice();

    let bins = d3.bin()
                    .domain(x.domain())
                    .thresholds(x.ticks(count))(values);

    return {bins, xDomain: x.domain()};
}

function renderCostHistogramMiniVersion(data) {
    let svg = d3.select("#cost-chart");
    // to remove all content regarding svg
    svg.selectAll("*").remove();

    let margin = {top: 5, right: 5, bottom: 20, left: 5};
    let width = 300 - margin.left - margin.right;
    let height = 90 - margin.top - margin.bottom;

    svg.attr("viewBox", `0 0 300 90`);

    let g = svg.append("g")
                    .attr("transform", `translate(${margin.left},${margin.top})`);

    let histo = settingUpCostHistogram(data, 6);
    if (!histo) return;

    let x = d3.scaleLinear()
                    .domain(histo.xDomain)
                    .range([0, width]);

    let y = d3.scaleLinear()
                    .domain([0, d3.max(histo.bins, d => d.length)])
                    .range([height, 0]);

    svg.selectAll("rect")
                .data(histo.bins)
                .enter()
                .append("rect")
                .attr("x", d => x(d.x0))
                .attr("y", d => y(d.length))
                .attr("width", d => Math.max(0, x(d.x1) - x(d.x0) - 1))
                .attr("height", d => height - y(d.length))
                .attr("fill", "#69b3a2");

    let xAxis = d3.axisBottom(x)
                    .ticks(4)
                    .tickFormat(d => `${d / 1e6}M €`);

    g.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(xAxis)
            .selectAll("text")
            .attr("font-size", "9px")
            .attr("transform", "rotate(-30)")
            .style("text-anchor", "middle");
    
    g.append("text")
            .attr("x", width/2)
            .attr("y", height+22)
            .attr("text-anchor", "middle")
            .attr("font-size", "9px")
            .attr("fill", "#555");

}

function renderCostHistogram(data, svgSelector = "#chart-modal-svg") {
    let svg = d3.select(svgSelector);
    // to remove all content regarding svg
    svg.selectAll("*").remove();

    let margin = {top: 20, right: 20, bottom: 50, left: 60};
    let width = 500 - margin.left - margin.right;
    let height = 300 - margin.top - margin.bottom;

    svg.attr("viewBox", `0 0 500 300`);

    let g = svg.append("g")
                    .attr("transform", `translate(${margin.left},${margin.top})`);

    let histo = settingUpCostHistogram(data, 15);
    if (!histo) return;

    let x = d3.scaleLinear()
                    .domain(histo.xDomain)
                    .range([0, width]);

    let y = d3.scaleLinear()
                    .domain([0, d3.max(histo.bins, d => d.length)])
                    .nice()
                    .range([height, 0]);

    g.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(x).ticks(6).tickFormat(d => `$${d / 1e6}M`));

    g.append("g").call(d3.axisLeft(y));

    g.selectAll(".bar")
                .data(histo.bins)
                .enter()
                .append("rect")
                .attr("class", "bar")
                .attr("x", d => x(d.x0))
                .attr("y", d => y(d.length))
                .attr("width", d => Math.max(0, x(d.x1) - x(d.x0) - 1))
                .attr("height", d => height - y(d.length))
                .attr("fill", "#69b3a2");
}



// setting up the timeline
function settingUpProjectsByYear(data) {
    return d3.rollups(data, v => v.length, d => +d.begin_year)
                                .filter(([year]) => !isNaN(year))
                                .map((([year, count]) => ({
                                    year: year,
                                    count: count
                                })))
                                .sort((a,b) => a.year - b.year);
}

function renderTimeLineMiniVersion(data) {
    let svg = d3.select("#year-chart");
    // to remove all content regarding svg
    svg.selectAll("*").remove();

    let margin = {top: 8, right: 8, bottom: 22, left: 8};
    let width = 300 - margin.left - margin.right;
    let height = 90 - margin.top - margin.bottom;

    svg.attr("viewBox", `0 0 300 90`);

    let g = svg.append("g")
                    .attr("transform", `translate(${margin.left},${margin.top})`);

    let timel = settingUpProjectsByYear(data);
    if (timel.length < 2) return;

    let x = d3.scaleLinear()
                    .domain(d3.extent(timel, d => d.year))
                    .range([0, width]);

    let y = d3.scaleLinear()
                    .domain([0, d3.max(timel, d => d.count)])
                    .range([height, 0]);

    let timelineArea = d3.area()
                            .x(d => x(d.year))
                            .y0(height)
                            .y1(d => d.count)
                            .curve(d3.curveMonotoneX);

    let timelineLine = d3.line()
                            .x(d => x(d.year))
                            .y(d => y(d.count))
                            .curve(d3.curveMonotoneX);

    g.append("path")
                .datum(timel)
                .attr("fill", "#69b3a2")
                .attr("opacity", 0.4)
                .attr("d", timelineArea);

    g.append("path")
                .datum(timel)
                .attr("fill", "none")
                .attr("stroke", "#2c7c6d")
                .attr("stroke-width", 2)
                .attr("d", timelineLine); 

    let xAxis = d3.axisBottom(x)
                    .ticks(4)
                    .tickFormat(d3.format("d"));

    g.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(xAxis)
            .selectAll("text")
            .attr("font-size", "9px")
            .attr("transform", "rotate(-30)")
            .style("text-anchor", "middle");
    
    g.append("text")
            .attr("x", width/2)
            .attr("y", height+18)
            .attr("text-anchor", "middle")
            .attr("font-size", "9px")
            .attr("fill", "#555");
}

function renderTimeLine(data, svgSelector = "#chart-modal-svg") {
    let svg = d3.select(svgSelector);
    // to remove all content regarding svg
    svg.selectAll("*").remove();

    let margin = {top: 20, right: 20, bottom: 50, left: 60};
    let width = 500 - margin.left - margin.right;
    let height = 300 - margin.top - margin.bottom;

    svg.attr("viewBox", `0 0 500 300`);

    let g = svg.append("g")
                    .attr("transform", `translate(${margin.left},${margin.top})`);

    let timel = settingUpProjectsByYear(data);
    if (timel.length < 2) return;

    let x = d3.scaleLinear()
                    .domain(d3.extent(timel, d => d.year))
                    .range([0, width]);

    let y = d3.scaleLinear()
                    .domain([0, d3.max(timel, d => d.count)])
                    .nice()
                    .range([height, 0]);

    let timelineArea = d3.area()
                            .x(d => x(d.year))
                            .y0(height)
                            .y1(d => d.count)
                            .curve(d3.curveMonotoneX);

    let timelineLine = d3.line()
                            .x(d => x(d.year))
                            .y(d => y(d.count))
                            .curve(d3.curveMonotoneX);

    g.append("path")
                .datum(timel)
                .attr("fill", "#69b3a2")
                .attr("opacity", 0.35)
                .attr("d", timelineArea);

    g.append("path")
                .datum(timel)
                .attr("fill", "none")
                .attr("stroke", "#2c7c6d")
                .attr("stroke-width", 2.5)
                .attr("d", timelineLine); 

    g.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(x).ticks(6).tickFormat(d3.format("d")));

    g.append("g").call(d3.axisLeft(y));

    g.append("text")
            .attr("x", width/2)
            .attr("y", height+40)
            .attr("text-anchor", "middle")
            .text("Start Year");
    
    g.append("text")
            .attr("x", -height/2)
            .attr("y", -45)
            .attr("transform", "rotate(-90)")
            .attr("font-size", "9px")
            .text("Number of Projects");
}
