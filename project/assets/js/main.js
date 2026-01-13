
let filters = {
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

// country
let countryFilter = document.getElementById("country-filter");
let countryPanel = document.getElementById("country-panel");
let countryOptions = document.getElementById("country-options");

countryFilter.addEventListener("click", () => {
    countryPanel.classList.toggle("open");
});

// city
let cityFilter = document.getElementById("city-filter");
let cityPanel = document.getElementById("city-panel");
let cityOptions = document.getElementById("city-options");

cityFilter.addEventListener("click", () => {
    cityPanel.classList.toggle("open");
});

// start year
let startYearFilter = document.getElementById("start-year-filter");
let startYearPanel = document.getElementById("start-year-panel");

startYearFilter.addEventListener("click", () => {
    startYearPanel.classList.toggle("open");
});

// end year
let endYearFilter = document.getElementById("end-year-filter");
let endYearPanel = document.getElementById("end-year-panel");

endYearFilter.addEventListener("click", () => {
    endYearPanel.classList.toggle("open");
});

// nbs area
let nbsAreaFilter = document.getElementById("nbs-area-filter");
let nbsAreaPanel = document.getElementById("nbs-area-panel");
let nbsAreaMin = document.getElementById("nbs-area-min");
let nbsAreaMax = document.getElementById("nbs-area-max");
let nbsAreaMinLabel = document.getElementById("nbs-area-min-label");
let nbsAreaMaxLabel = document.getElementById("nbs-area-max-label");

nbsAreaFilter.addEventListener("click", () => {
    nbsAreaPanel.classList.toggle("open");
})

// area before intervention
let previousAreaFilter = document.getElementById("previous-area-filter");
let previousAreaPanel = document.getElementById("previous-area-panel");
let previousAreaOptions = document.getElementById("previous-area-options");

previousAreaFilter.addEventListener("click", () => {
    previousAreaPanel.classList.toggle("open");
});

// nbs type
let nbsTypeFilter = document.getElementById("nbs-type-filter");
let nbsTypePanel = document.getElementById("nbs-type-panel");
let nbsTypeOptions = document.getElementById("nbs-type-options");

nbsTypeFilter.addEventListener("click", () => {
    nbsTypePanel.classList.toggle("open");
});

// total cost
let totalCostFilter = document.getElementById("cost-filter");
let totalCostPanel = document.getElementById("cost-panel");
let totalCostMin = document.getElementById("cost-min");
let totalCostMax = document.getElementById("cost-max");
let totalCostMinLabel = document.getElementById("cost-min-label");
let totalCostMaxLabel = document.getElementById("cost-max-label");

totalCostFilter.addEventListener("click", () => {
    totalCostPanel.classList.toggle("open");
})

// sources of funding
let fundingFilter = document.getElementById("funding-filter");
let fundingPanel = document.getElementById("funding-panel");
let fundingOptions = document.getElementById("funding-options");

fundingFilter.addEventListener("click", () => {
    fundingPanel.classList.toggle("open");
});

// environmental impacts
let envImpactsFilter = document.getElementById("env-impact-filter");
let envImpactsPanel = document.getElementById("env-impact-panel");
let envImpactsOptions = document.getElementById("env-impact-options");

envImpactsFilter.addEventListener("click", () => {
    envImpactsPanel.classList.toggle("open");
});

// economic impacts
let econImpactsFilter = document.getElementById("econ-impact-filter");
let econImpactsPanel = document.getElementById("econ-impact-panel");
let econImpactsOptions = document.getElementById("econ-impact-options");

econImpactsFilter.addEventListener("click", () => {
    econImpactsPanel.classList.toggle("open");
});

// comparing procedure
let comparingSet = new Set();


let wholeData = [];
let filteredData = [];
let radarMaxValues = null;

d3.csv("./assets/data/cleaned.csv").then(data => {
    
    wholeData = data;
    maxValuesRadar = computeRadarMaxValues(wholeData);
    
    // to show every project when open the page
    renderResults(wholeData);
    
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

    let searchBarInput = document.getElementById("search-input");

    searchBarInput.addEventListener("input", (e) => {
        filters.search = e.target.value.trim().toLowerCase();
        applyFilters();
    })

    countryOptions.addEventListener("change", (e) => {
        let checkbox = e.target;
        
        if (checkbox.checked) {
            filters.countries.add(checkbox.value);
        } else {
            filters.countries.delete(checkbox.value);
        }

        countryFilter.classList.toggle("active", filters.countries.size > 0);

        let filteredCountry = wholeData;
        if (filters.countries.size > 0) {
            filteredCountry = wholeData.filter(d => 
                filters.countries.has(d.country)
            );
        }

        filters.cities.clear();
        cityFilter.classList.remove("active");

        renderCityOptions(filteredCountry);

        applyFilters();
    });

    cityOptions.addEventListener("change", (e) => {
        let checkbox = e.target;

        if (checkbox.checked) {
            filters.cities.add(checkbox.value);
        } else {
            filters.cities.delete(checkbox.value);
        }

        cityFilter.classList.toggle("active", filters.cities.size > 0);

        applyFilters();
    });

    nbsAreaMin.addEventListener("input", updateNbsAreaFilter);
    nbsAreaMax.addEventListener("input", updateNbsAreaFilter);

    previousAreaOptions.addEventListener("change", (e) => {
        let checkbox = e.target;

        if (checkbox.checked) {
            filters.previousArea.add(checkbox.value);
        } else {
            filters.previousArea.delete(checkbox.value);
        }

        previousAreaFilter.classList.toggle("active", filters.previousArea.size > 0);

        applyFilters();
    });

    nbsTypeOptions.addEventListener("change", (e) => {
        let checkbox = e.target;

        if (checkbox.checked) {
            filters.nbsType.add(checkbox.value);
        } else {
            filters.nbsType.delete(checkbox.value);
        }

        nbsTypeFilter.classList.toggle("active", filters.nbsType.size > 0);

        applyFilters();
    });

    totalCostMin.addEventListener("input", updateCostFilter);
    totalCostMax.addEventListener("input", updateCostFilter);

    fundingOptions.addEventListener("change", (e) => {
        let checkbox = e.target;

        if (checkbox.checked) {
            filters.funding.add(checkbox.value);
        } else {
            filters.funding.delete(checkbox.value);
        }

        fundingFilter.classList.toggle("active", filters.funding.size > 0);

        applyFilters();
    });

    envImpactsOptions.addEventListener("change", (e) => {
        let checkbox = e.target;

        if (checkbox.checked) {
            filters.envImpacts.add(checkbox.value);
        } else {
            filters.envImpacts.delete(checkbox.value);
        }

        envImpactsFilter.classList.toggle("active", filters.envImpacts.size > 0);

        applyFilters();
    });

    econImpactsOptions.addEventListener("change", (e) => {
        let checkbox = e.target;

        if (checkbox.checked) {
            filters.econImpacts.add(checkbox.value);
        } else {
            filters.econImpacts.delete(checkbox.value);
        }

        econImpactsFilter.classList.toggle("active", filters.econImpacts.size > 0);

        applyFilters();
    });

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


function applyFilters() {
    filteredData = wholeData;

    // search
    if (filters.search) {
        filteredData = filteredData.filter(d => {
            let searchText = [
                d.intervention_name,
                d.country,
                d.city,
                d.nbs_type,
                d.previous_area_type,
                d.sources_of_funding
            ].filter(Boolean).join(" ").toLocaleLowerCase();

            return searchText.includes(filters.search);
        })
    }
    
    // county
    if (filters.countries.size > 0) {
        filteredData = filteredData.filter(d => 
            filters.countries.has(d.country)
        );
    }

    // city
    if (filters.cities.size > 0) {
        filteredData = filteredData.filter(d => 
            filters.cities.has(d.city)
        );
    }

    // start year
    if (filters.startYear !== null) {
        filteredData = filteredData.filter(d => 
            +d.begin_year >= filters.startYear
        );
    }

    // end year
    if (filters.endYear !== null) {
        filteredData = filteredData.filter(d => 
            +d.end_year <= filters.endYear
        );
    }

    // nbs area
    if (filters.nbsArea && filters.nbsArea[0] !== null) {
        filteredData = filteredData.filter(d => {
            let nbsArea = +d.nbs_area;
            return nbsArea >= filters.nbsArea[0] && nbsArea <= filters.nbsArea[1];
        });
    }

    // area before intervention
    if (filters.previousArea.size > 0) {
        filteredData = filteredData.filter(d => 
            filters.previousArea.has(d.previous_area_type)
        );
    }

    // nbs type
    if (filters.nbsType.size > 0) {
        filteredData = filteredData.filter(d => {
            if (!d.nbs_type || d.nbs_type === "Unknown") return;

            let projTypes = d.nbs_type.split(";").map(t => t.trim());
            return projTypes.some(t => filters.nbsType.has(t));
        });
    }

    // total cost
    if (filters.totalCost && filters.totalCost[0] !== null) {
        filteredData = filteredData.filter(d => {
            let totalCost = +d.total_cost;
            if (isNaN(totalCost)) return false;
            return totalCost >= filters.totalCost[0] && totalCost <= filters.totalCost[1];
        });
    }

    // sources of funding
    if (filters.funding.size > 0) {
        filteredData = filteredData.filter(d => 
            d.sources_of_funding && d.sources_of_funding !== "Unknown" && filters.funding.has(d.sources_of_funding)
        );
    }

    // environmental impacts
    if (filters.envImpacts.size > 0) {
        filteredData = filteredData.filter(d => {
            if (!d.environmental_impacts || d.environmental_impacts === "Unknown") return;

            let projTypes = d.environmental_impacts.split(";").map(t => t.trim());
            return projTypes.some(t => filters.envImpacts.has(t));
        });
    }

    // economic impacts
    if (filters.econImpacts.size > 0) {
        filteredData = filteredData.filter(d => {
            if (!d.economic_impacts || d.economic_impacts === "Unknown") return;

            let projTypes = d.economic_impacts.split(";").map(t => t.trim());
            return projTypes.some(t => filters.econImpacts.has(t));
        });
    }

    // active filters
    renderActiveFilters();

    // console.log("Filtered Projects: ", filteredData);
    renderResults(filteredData);
}

function renderCountryOptions(data) {
    let countries = [...new Set(data.map(d => d.country))].sort();

    countries.forEach(country => {
        let label = document.createElement("label");
        label.innerHTML = `<input type="checkbox" value="${country}">
                            ${country}`;

        countryOptions.appendChild(label);
    });
}

function renderCityOptions(data) {
    cityOptions.innerHTML = "";

    let cities = [...new Set(data.map(d => d.city))]
                                .filter(d => d && d !== "Unknown")
                                .sort();
    
    cities.forEach(city => {
        let label = document.createElement("label");
        label.innerHTML = `<input type="checkbox" value="${city}">
                            ${city}`;

        cityOptions.appendChild(label);
    });

}

function renderStartYearOptions(data) {
    let stContainer = document.getElementById("start-year-options");
    stContainer.innerHTML = "";

    let years = [...new Set(data.map(d => +d.begin_year))]
                                .filter(y => !isNaN(y))
                                .sort((a,b) => a - b);

    years.forEach(year => {
        let div = document.createElement("div");
        div.className = "year-option";
        div.textContent = year;

        div.addEventListener("click", () => {

            if (filters.startYear === year) {
                filters.startYear = null;
                div.classList.remove("selected");
                startYearFilter.classList.remove("active");
            } else {
                filters.startYear = year;

                document.querySelectorAll(".year-option").forEach(element => element.classList.remove("selected"));
                div.classList.add("selected");

                document.getElementById("start-year-filter").classList.add("active");
            }

            applyFilters();
        });
        stContainer.appendChild(div);
    });
}

function renderEndYearOptions(data) {
    let endContainer = document.getElementById("end-year-options");
    endContainer.innerHTML = "";

    let years = [...new Set(data.map(d => +d.end_year))]
                                .filter(y => !isNaN(y))
                                .sort((a,b) => a - b);

    years.forEach(year => {
        let div = document.createElement("div");
        div.className = "year-option";
        div.textContent = year;

        div.addEventListener("click", () => {

            if (filters.endYear === year) {
                filters.endYear = null;
                div.classList.remove("selected");
                endYearFilter.classList.remove("active");
            } else {
                filters.endYear = year;

                document.querySelectorAll(".end-year-options .year-option").forEach(element => element.classList.remove("selected"));
                div.classList.add("selected");

                endYearFilter.classList.add("active");
            }

            applyFilters();
        });
        endContainer.appendChild(div);
    });
}

let nbsAreaDefaults = [null, null];
function initializeNbsAreaSlider(data) {
    let nbsAreas = data.map(d => +d.nbs_area).filter(v => !isNaN(v));

    let min = Math.min(...nbsAreas);
    let max = Math.max(...nbsAreas);

    nbsAreaMin.min = min;
    nbsAreaMin.max = max;
    nbsAreaMax.min = min;
    nbsAreaMax.max = max;
    nbsAreaMin.value = min;
    nbsAreaMax.value = max;

    nbsAreaMinLabel.textContent = `Min: ${min}`;
    nbsAreaMaxLabel.textContent = `Max: ${max}`;

    nbsAreaDefaults = [min, max];
    filters.nbsArea = [min, max];
}

function updateNbsAreaFilter() {
    let min = +nbsAreaMin.value;
    let max = +nbsAreaMax.value;

    if (min > max) {
        [min, max] = [max, min];
        nbsAreaMin.value = min;
        nbsAreaMax.value = max;
    }

    filters.nbsArea = [min, max];
    nbsAreaMinLabel.textContent = `Min: ${min}`;
    nbsAreaMaxLabel.textContent = `Max: ${max}`;

    nbsAreaFilter.classList.add("active");

    applyFilters();
}

function renderPreviousAreaOptions(data) {
    previousAreaOptions.innerHTML = "";
    let previousAreas = [...new Set(data.map(d => d.previous_area_type))]
                                        .filter(d => d && d !== "Unknown").sort();

    previousAreas.forEach(previousArea => {
        let label = document.createElement("label");
        label.innerHTML = `<input type="checkbox" value="${previousArea}">
                            ${previousArea}`;

        previousAreaOptions.appendChild(label);
    });
}

function renderNbsTypeOptions(data) {
    nbsTypeOptions.innerHTML = "";
    let nbsTypes = new Set();

    data.forEach(d => {
        if (!d.nbs_type || d.nbs_type === "Unknown") return;

        d.nbs_type.split(";").map(t => t.trim()).forEach(t => nbsTypes.add(t));
    });

    [...nbsTypes].sort().forEach(nbsType => {
        let label = document.createElement("label");
        label.innerHTML = `<input type="checkbox" value="${nbsType}">
                            ${nbsType}`;

        nbsTypeOptions.appendChild(label);
    });
}

let totalCostDefaults = [null, null]
function initializeCostSlider(data) {
    let totalCosts = data.map(d => +d.total_cost).filter(v => !isNaN(v));

    let min = Math.min(...totalCosts);
    let max = Math.max(...totalCosts);

    totalCostMin.min = min;
    totalCostMin.max = max;
    totalCostMax.min = min;
    totalCostMax.max = max;
    totalCostMin.value = min;
    totalCostMax.value = max;

    totalCostMinLabel.textContent = `Min: ${min}€`;
    totalCostMaxLabel.textContent = `Max: ${max}€`;

    totalCostDefaults = [min, max];
    filters.totalCost = [min, max];
}

function updateCostFilter() {
    let min = +totalCostMin.value;
    let max = +totalCostMax.value;

    if (min > max) {
        [min, max] = [max, min];
        totalCostMin.value = min;
        totalCostMax.value = max;
    }

    filters.totalCost = [min, max];
    totalCostMinLabel.textContent = `Min: ${min}`;
    totalCostMaxLabel.textContent = `Max: ${max}`;

    totalCostFilter.classList.add("active");

    applyFilters();
}

function renderFundingOptions(data) {
    fundingOptions.innerHTML = "";

    let fundings = [...new Set(data.map(d => d.sources_of_funding))]
                                .filter(d => d && d !== "Unknown")
                                .sort();
    
    fundings.forEach(funding => {
        let label = document.createElement("label");
        label.innerHTML = `<input type="checkbox" value="${funding}">
                            ${funding}`;

        fundingOptions.appendChild(label);
    });

}

function renderEnvironmentalImpactsOptions(data) {
    envImpactsOptions.innerHTML = "";
    let envImpacts = new Set();

    data.forEach(d => {
        if (!d.environmental_impacts || d.environmental_impacts === "Unknown") return;

        d.environmental_impacts.split(";").map(t => t.trim()).forEach(t => envImpacts.add(t));
    });

    [...envImpacts].sort().forEach(envImpact => {
        let label = document.createElement("label");
        label.innerHTML = `<input type="checkbox" value="${envImpact}">
                            ${envImpact}`;

        envImpactsOptions.appendChild(label);
    });
}

function renderEconomicImpactsOptions(data) {
    econImpactsOptions.innerHTML = "";
    let econImpacts = new Set();

    data.forEach(d => {
        if (!d.economic_impacts || d.economic_impacts === "Unknown") return;

        d.economic_impacts.split(";").map(t => t.trim()).forEach(t => econImpacts.add(t));
    });

    [...econImpacts].sort().forEach(econImpact => {
        let label = document.createElement("label");
        label.innerHTML = `<input type="checkbox" value="${econImpact}">
                            ${econImpact}`;

        econImpactsOptions.appendChild(label);
    });
}

function renderActiveFilters() {
    let activeContainer = document.getElementById("active-filters");
    activeContainer.innerHTML = "";

    // search
    if (filters.search) {
        addActiveTag("Search", `"${filters.search}"`, () => {
            filters.search = "";
            document.getElementById("search-input").value = "";
            applyFilters();
        })
    }

    // countries
    filters.countries.forEach(country => {
        addActiveTag("Country", country, () => {
            filters.countries.delete(country);
            document.querySelectorAll(`#country-options input[value="${country}"]`).forEach(cb => cb.checked = false);
            countryFilter.classList.toggle("active", filters.countries.size > 0);
            applyFilters();
        });
     });

    //  cities
    filters.cities.forEach(city => {
        addActiveTag("City", city, () => {
            filters.cities.delete(city);
            document.querySelectorAll(`#city-options input[value="${city}"]`).forEach(cb => cb.checked = false);
            cityFilter.classList.toggle("active", filters.cities.size > 0);
            applyFilters();
        });
     });

    //  start year
    if (filters.startYear !== null) {
        addActiveTag("Start Year", filters.startYear, () => {
            filters.startYear = null;
            document.querySelectorAll("#start-year-options .year-option").forEach(d => d.classList.remove("selected"));
            startYearFilter.classList.remove("active");
            applyFilters();
        });
     }

    //  end year
    if (filters.endYear !== null) {
        addActiveTag("End Year", filters.endYear, () => {
            filters.endYear = null;
            document.querySelectorAll("#end-year-options .year-option").forEach(d => d.classList.remove("selected"));
            endYearFilter.classList.remove("active");
            applyFilters();
        });
     }

    //  nbs area
    if (filters.nbsArea[0] !== nbsAreaDefaults[0] || filters.nbsArea[1] !== nbsAreaDefaults[1]) {
        addActiveTag("NbS Area m2", `${filters.nbsArea[0]} - ${filters.nbsArea[1]}`, () => {
            filters.nbsArea = [nbsAreaMin.min, nbsAreaMax.max];
            nbsAreaMin.value = nbsAreaMin.min;
            nbsAreaMax.value = nbsAreaMax.max;
            nbsAreaMinLabel.textContent = `Min: ${nbsAreaMin.min}`;
            nbsAreaMaxLabel.textContent = `Max: ${nbsAreaMax.max}`;


            nbsAreaFilter.classList.remove("active");
            nbsAreaPanel.classList.remove("open");
            applyFilters();
        });
    }

    // area before implementation
    filters.previousArea.forEach(area => {
        addActiveTag("Area before Implementation", area, () => {
            filters.previousArea.delete(area);
            document.querySelectorAll(`#previous-area-options input[value="${area}"]`).forEach(cb => cb.checked = false);
            previousAreaFilter.classList.toggle("active", filters.previousArea.size > 0);
            applyFilters();
        });
     });

     //  nbs type
    filters.nbsType.forEach(type => {
        addActiveTag("NbS Type", type, () => {
            filters.nbsType.delete(type);
            document.querySelectorAll(`#nbs-type-options input[value="${type}"]`).forEach(cb => cb.checked = false);
            nbsTypeFilter.classList.toggle("active", filters.nbsType.size > 0);
            applyFilters();
        });
     });

    //  total cost
    if (filters.totalCost[0] !== totalCostDefaults[0] || filters.totalCost[1] !== totalCostDefaults[1]) {
        addActiveTag("Total Cost", `${filters.totalCost[0]} - ${filters.totalCost[1]}`, () => {
            initializeCostSlider(wholeData);
            totalCostFilter.classList.remove("active");
            applyFilters();
        });
    }

    // sources of funding
    filters.funding.forEach(funding => {
        addActiveTag("Sources of Funding", funding, () => {
            filters.funding.delete(funding);
            document.querySelectorAll(`#funding-options input[value="${funding}"]`).forEach(cb => cb.checked = false);
            fundingFilter.classList.toggle("active", filters.funding.size > 0);
            applyFilters();
        });
     });

    // environmental impacts
    filters.envImpacts.forEach(envImpact => {
        addActiveTag("Environmental Impacts", envImpact, () => {
            filters.envImpacts.delete(envImpact);
            document.querySelectorAll(`#env-impact-options input[value="${envImpact}"]`).forEach(cb => cb.checked = false);
            envImpactsFilter.classList.toggle("active", filters.envImpacts.size > 0);
            applyFilters();
        });
     });

     // economic impacts
    filters.econImpacts.forEach(econImpact => {
        addActiveTag("Economic Impacts", econImpact, () => {
            filters.econImpacts.delete(econImpact);
            document.querySelectorAll(`#econ-impact-options input[value="${econImpact}"]`).forEach(cb => cb.checked = false);
            econImpactsFilter.classList.toggle("active", filters.econImpacts.size > 0);
            applyFilters();
        });
     });
    
}

function addActiveTag(label, value, onRemove) {
    let actContainer = document.getElementById("active-filters");

    let activeTag = document.createElement("div");
    activeTag.className = "filter-tag";
    activeTag.innerHTML = `
    <span><strong>${label}:</strong> ${value}</span>
    <button>x</button>`;

    activeTag.querySelector("button").addEventListener("click", onRemove);
    actContainer.appendChild(activeTag);
}

function renderResults(data) {
    let resultsList = document.getElementById("results-list");
    let resultsCount = document.getElementById("results-count");

    resultsList.innerHTML = "";
    resultsCount.textContent = `${data.length} Project(s)`;

    if (data.length === 0) {
        resultsList.innerHTML = "<p> No project found for the selected filters.</p>";
        return;
    }

    data.forEach(d => {
        let projectCard = document.createElement("div");
        projectCard.className = "project-card";
        let projectId = d.intervention_name;

        projectCard.innerHTML = `
            <div class="project-card-header">
                <h4>${d.intervention_name || "Unnamed project"}</h4>
            </div>
            <div class="project-meta">
                <strong>Country:</strong> ${d.country || "-"} |
                <strong>City:</strong> ${d.city || "-"} <br>
                <strong>Start:</strong> ${d.begin_year || "-"} -
                <strong>End:</strong> ${d.end_year || "-"} <br>
                <strong>NbS Area:</strong> ${d.nbs_area || "-"}m2 |
                <strong>Total Cost:</strong> ${d.total_cost || "-"}€ <br>
                <label class="compare-option">
                    <input type="checkbox" data-id="${projectId}">
                    Compare
                </label>
            </div>
            `;

        projectCard.innerHTML += `
            <div class="project-hover-panel">
                <p><strong>Country:</strong> ${d.country}</p>
                <p><strong>City:</strong> ${d.city}</p>
                <p><strong>Start Year:</strong> ${d.begin_year}</p>
                <p><strong>End Year:</strong> ${d.end_year}</p>
                <p><strong>NbS Area:</strong> ${d.nbs_area}</p>
                <p><strong>Area before Implementation:</strong> ${d.previous_area_type}</p>
                <p><strong>NbS Type:</strong> ${d.nbs_type}m2</p>
                <p><strong>Total Cost:</strong> ${d.total_cost}€</p>
                <p><strong>Sources of Funding:</strong> ${d.sources_of_funding}</p>
                <p><strong>Environmental Impacts:</strong> ${d.environmental_impacts}</p>
                <p><strong>Economic Impacts:</strong> ${d.economic_impacts}</p>
            </div>
            `;

        let hoverProjectPanel = projectCard.querySelector(".project-hover-panel");
        let hoverTimeout = null;

        projectCard.addEventListener("mouseenter", () => {
            hoverTimeout = setTimeout(() => {
                hoverProjectPanel.style.display = "block";
                // to ensure that the hover is displayed in the page and not outside for every project card
                hoverProjectPanel.style.left = "100%";
                hoverProjectPanel.style.right = "auto";
                hoverProjectPanel.style.marginLeft = "10px";
                hoverProjectPanel.style.marginRight = "0";

                // we getting the position of the card so to know where to open the hover panel
                requestAnimationFrame(() => {
                    let panelRect = hoverProjectPanel.getBoundingClientRect();
                    // let viewWidth = window.innerWidth;
                    let containerRec = document.getElementById("results-panel").getBoundingClientRect();

                    if (panelRect.right > containerRec.right) {
                        hoverProjectPanel.style.left = "auto";
                        hoverProjectPanel.style.right = "100%";
                        hoverProjectPanel.style.marginLeft = "0";
                        hoverProjectPanel.style.marginRight = "10px";
                    }
                });
            }, 1500);
        });

        projectCard.addEventListener("mouseleave", () => {
            clearTimeout(hoverTimeout);
            hoverProjectPanel.style.display = "none";
        })

        let compareCheckbox = projectCard.querySelector('input[type="checkbox"]');
        compareCheckbox.checked = comparingSet.has(projectId);

        compareCheckbox.addEventListener("change", () => {
            if (compareCheckbox.checked) {
                comparingSet.add(projectId);
            } else {
                comparingSet.delete(projectId);
            }
            console.log("Comparing Set: ", [...comparingSet]);
            updateCompareBar();
        })
        
        resultsList.appendChild(projectCard);

    });
}

function updateCompareBar() {
    let compareBar = document.getElementById("compare-bar");
    let compareCount = document.getElementById("compare-count");

    if (comparingSet.size >= 2) {
        compareBar.classList.remove("hidden");
        compareCount.textContent = `${comparingSet.size} projects selected`;
    } else {
        compareBar.classList.add("hidden");
    }
}

function renderComparisonView(projects) {
    let comparisonResultsPanel = document.getElementById("comparison-results-panel");

    comparisonResultsPanel.innerHTML = `
    <h2>Project Comparison</h2>
    <div class="comparison-grid"></div>`;
    // <button id="back-to-results"><- Back to results</button> 

    let comparisonGrid = comparisonResultsPanel.querySelector(".comparison-grid");

    projects.forEach(p => {
        let column = document.createElement("div");
        column.className = "comparison-column";

        column.innerHTML = `
        <h3>${p.intervention_name}</h3>
        <p><strong>Country:</strong> ${p.country}</p>
        <p><strong>City:</strong> ${p.city}</p>
        <p><strong>Start Year:</strong> ${p.begin_year}</p>
        <p><strong>End Year:</strong> ${p.end_year}</p>
        <p><strong>NbS Area:</strong> ${p.nbs_area}</p>
        <p><strong>Area before Implementation:</strong> ${p.previous_area_type}</p>
        <p><strong>NbS Type:</strong> ${p.nbs_type}</p>
        <p><strong>Total Cost:</strong> ${p.total_cost}</p>
        <p><strong>Sources of Funding:</strong> ${p.sources_of_funding}</p>
        <p><strong>Environmental Impacts:</strong> ${p.environmental_impacts}</p>
        <p><strong>Economic Impacts:</strong> ${p.economic_impacts}</p>`
        ;

        comparisonGrid.appendChild(column);
    });

    // document.getElementById("back-to-results").addEventListener("click", () => {
    //     renderResults(filteredData || wholeData);
    //     updateCompareBar();
    //     showResultsView();
    // });
}

function showComparisonView() {
    document.getElementById("results-panel").classList.add("hidden");
    document.getElementById("comparison-results-panel").classList.remove("hidden");
    document.getElementById("comparison-radar-container").classList.remove("hidden");
    document.getElementById("search-bar").classList.add("hidden");
}

function showResultsView() {
    document.getElementById("comparison-results-panel").classList.add("hidden");
    document.getElementById("comparison-radar-container").classList.add("hidden");
    document.getElementById("results-panel").classList.remove("hidden");
}


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