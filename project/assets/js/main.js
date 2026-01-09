
let filters = {
    countries: new Set(),
    cities: new Set(),
    startYear: null,
    endYear: null,
    nbsArea: [null, null]
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


let wholeData = [];
let filteredData = [];

d3.csv("./assets/data/cleaned.csv").then(data => {
    
    wholeData = data;
    
    renderCountryOptions(wholeData);
    renderCityOptions(wholeData);
    renderStartYearOptions(wholeData);
    renderEndYearOptions(wholeData);

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


});


function applyFilters() {
    let filteredData = wholeData;
    
    if (filters.countries.size > 0) {
        filteredData = filteredData.filter(d => 
            filters.countries.has(d.country)
        );
    }

    if (filters.cities.size > 0) {
        filteredData = filteredData.filter(d => 
            filters.cities.has(d.city)
        );
    }

    if (filters.startYear !== null) {
        filteredData = filteredData.filter(d => 
            +d.begin_year >= filters.startYear
        );
    }

    if (filters.endYear !== null) {
        filteredData = filteredData.filter(d => 
            +d.end_year <= filters.endYear
        );
    }

    console.log("Filtered Projects: ", filteredData);
    // updateResults(filteredData);
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