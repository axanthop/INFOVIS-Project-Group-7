class MapVis{
    constructor(parentElement, WorldData, cityData){
        this.parentElement = parentElement;
        this.WorldData = WorldData;
        this.cityData = cityData;

        this.initVis();
    }
    initVis(){
        let vis = this;
        vis.currentZoom = 1;
        vis.margin = {top:20, right:20, bottom:20, left:20};
        vis.width = document.getElementById(vis.parentElement).clientWidth- vis.margin.left-vis.margin.right;
        vis.height = 450 - vis.margin.top-vis.margin.bottom;
        vis.pieradius = 10;
        vis.colorScale = d3.scaleOrdinal(d3.schemeTableau10);

        vis.svg = d3.select("#"+vis.parentElement).append("svg")
            .attr("width", vis.width+vis.margin.left+vis.margin.right)
            .attr("height", vis.height+vis.margin.top+vis.margin.bottom)
            .append("g")
            .attr("transform",`translate(${vis.margin.left},${vis.margin.top})`);
        
        vis.contrainer = vis.svg.append("g")
            .attr("transform", `translate(${vis.margin.left},${vis.margin.top})`);

        vis.zoomGroup = vis.contrainer.append("g")
            .attr("class", "zoom-group");


        vis.projection = d3.geoNaturalEarth1()
                        .scale(vis.height/3)
                        .translate([vis.width/2, vis.height/2]);
        
        vis.path = d3.geoPath().projection(vis.projection);

        vis.world = topojson.feature(vis.WorldData, vis.WorldData.objects.countries).features;

        vis.arc =d3.arc;

        vis.zoomGroup.selectAll(".country")
            .data(vis.world)
            .enter()
            .append("path")
            .attr("class","country")
            .attr("d", vis.path)
            .attr("fill", "#ccc")
            .attr("stroke","#999");
        
       // vis.circlesGroup = vis.zoomGroup.append("g").attr("class", "city-circles");

        vis.glyphGroup = vis.zoomGroup.append("g").attr("class", "city-glyphs");

        vis.radiusScale = d3.scaleSqrt()
            .range([1,4]);
        
        vis.zoom = d3.zoom()
            .scaleExtent([1,10])
            .on("zoom", (event)=>{
                vis.currentZoom = event.transform.k;
                vis.zoomGroup.attr("transform", event.transform);

                // vis.circlesGroup.selectAll("circle")
                //     .attr("r", d=> vis.radiusScale(d.count)/vis.currentZoom);
            });

        vis.zoomGroup.selectAll(".pie-slice")
            .attr("d",d=>
                vis.arc
                    .innerRadius(0)
                    .outerRadius(vis.pieradius/vis.currentZoom)(d)
            );
        vis.svg.call(vis.zoom);
        d3.select("#zoom_in").on("click",()=>{
            vis.svg.transition()
                .duration(300)
                .call(vis.zoom.scaleBy, 1.5);
        });
        d3.select("#zoom_out").on("click",()=>{
            vis.svg.transition()
                .duration(300)
                .call(vis.zoom.scaleBy, 0.5);
        });
        d3.select("#zoom_reset").on("click",()=>{
            vis.svg.transition()
                .duration(300)
                .call(vis.zoom.transform,d3.zoomIdentity);
        });

        d3.select("#popup-close").on("click", ()=> { d3.select("#city-popup").classed("hidden", true);});   
    }
    updateVis(data){
        let vis = this;
        let projectsByCity = d3.rollups(
            data, 
            v => v, 
            d => `${d.city}|||${d.country}`
        );

        // const allCategories = Array.from(
        //     new Set(
        //         data.map(d=>d[window,selectedMetrics] || "Unknown")
        //     )
        // )
        // vis.colorScale.domain(allCategories);

        let citycounts = projectsByCity.map(([key, count])=>{
            let [city, country] = key.split("|||");

            let coords = vis.cityData.find(d=> d.city === city && d.country === country);

            if (!coords) return null;

            return {
                city: city,
                country: country,
                projects: count,
                count: count.length,
                latitude: +coords.latitude,
                longitude: +coords.longitude
            };
        }).filter(d=> d !== null);

       // vis.Circles(citycounts);
       vis.pieglyph(citycounts);
    }
    pieglyph(data){
        let vis = this;
        let allcat=new Set();

        let pierad= vis.pieradius/vis.currentZoom;

        const pie = d3.pie()
            .value(d=>d.value)
            .sort(null);


        data.forEach(d=>{
            d.projects.forEach(p=>{
                allcat.add(p[window.selectedMetrics] || "Unknown");
            });
        })

        const categories = Array.from(allcat);

        let glyphs= vis.glyphGroup
            .selectAll(".city-glyph")
            .data(data, d=>d.city+d.country);

        glyphs.exit().remove();

        let glyphsEnter = glyphs.enter()
            .append("g")
            .attr("class", "city-glyph")
            .on("click", (event,d)=>vis.showPop(event,d));
        
        glyphs = glyphsEnter.merge(glyphs);

        glyphs.attr("transform",d=>{
            const [x,y] = vis.projection([d.longitude, d.latitude]);
            return `translate(${x},${y})`;
        });


        glyphs.each(function(d){
            let glyph = d3.select(this);

        
            const pieData = d3.rollups(
                d.projects,
                v=>v.length,
                p=>p[window.selectedMetrics] || "Unknown").map(([key, value])=>({key, value}));

            const radius = Math.max(2, vis.radiusScale(d.count || 1)/vis.currentZoom);

            const arc = d3.arc()
                .innerRadius(0)
                .outerRadius(radius);

            const arcs= pie(pieData);
                
            glyph.selectAll("path")
                .data(pie(pieData),d=>d.data.key)
                .join(
                    enter => enter.append("path")
                        .attr("d",arc)
                        .attr("fill", d=>vis.colorScale(d.data.key))
                        .attr("stroke", "#999")
                        .attr("stroke-width", 0.3)
                    ,
                    update => update
                        .attr("d", arc)
                        .attr("fill", d=>vis.colorScale(d.data.key)),

                    exit => exit.remove()
                );
    });
}

    updateLegend(categories, colorScale){
        let legend = d3.select("#pie-legend");

        legend.html("");

        let items= legend.selectAll(".legend-item")
            .data(categories)
            .enter()
            .append("div")
            .attr("class", "legend-item");

        items.append("span")
            .attr("class", "legend-color")
            .style("background-color", d=>colorScale(d));

        items.append("span")
            .attr("class", "legend-label")
            .text(d=>d);

    }
    
    showPop(event, d){
        let vis= this;
        let popup = d3.select("#city-popup");

        popup.classed("hidden", false)
            .style("left", (event.pageX+10)+"px")
            .style("top", (event.pageY+10)+"px");

        const pieData =d3.rollups(
            d.projects,
            v=>v.length,
            p=>p[window.selectedMetrics] || "Unknown"
        ).map(([key, value])=>({key, value}));

        
        //build legend
        const legendHTML=`
        <div class="popup-legend">
            <h5>Legend (${window.selectedMetrics.replaceAll("_", " ")})</h5>
            ${pieData.map(d=>`
                <div class="popup-legend-item">
                    <span class="popup-legend-color" style="background:${vis.colorScale(d.key)}"></span>
                    <span class="popup-legend-label">${d.key} (${d.value})</span>
                </div>
                `).join("")}
        </div>
        `;  
        d3.select("#popup-content").html(`
            <h4>${d.city}, ${d.country}</h4>
            <p>Number of Projects: ${d.count}</p>

            

            <ul>
            ${d.projects.map(p => `<li>
                ${p.intervention_name || "Unnamed Project"}
                <button class="popup-more-info-btn" data-project="${p.intervention_name}">more info</button>
                <button class="popup-compare-btn" data-project="${p.intervention_name}">compare</button>
                </li>`).join("")}
            </ul>
            ${legendHTML}
            `);

        d3.select("#popup-content")
                    .selectAll(".popup-more-info-btn")
                    .on("click", (event) => {
                        let projectName = event.currentTarget.dataset.project;
                        let proj = wholeData.find(d => d.intervention_name === projectName);

                        if (!proj) return;

                        d3.select("#city-popup").classed("hidden", true);

                        renderProjectInfo(proj);
                        showProjectInfoView();

                        event.stopPropagation();
                    })
        
        d3.select("#popup-content")
                .selectAll(".popup-compare-btn")
                .on("click", (event)=>{
                    const projectId = event.currentTarget.dataset.project;

                    if(comparingSet.has(projectId)){
                        comparingSet.delete(projectId);
                    }
                    else{
                        comparingSet.add(projectId);
                    }
                    updateCompareBar();
                    event.stopPropagation();
                });
    }

    // hidePop(){
    //     // d3.select("#city-popup").classed("hidden", true);
    //     d3.select("#popup-close").on("click", ()=> { d3.select("#city-popup").classed("hidden", true);});   
    // }
}
