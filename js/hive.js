"use strict";

function getUrlVar(key){
    // https://gist.github.com/1771618
    var result = new RegExp(key + "=([^&]*)", "i").exec(window.location.search);
    return result && unescape(result[1]) || "";
}

function startsWith(s, pattern) {
    return s.lastIndexOf(pattern, 0) === 0;
}

function degrees(radians) {
    return radians / Math.PI * 180 - 90;
}

var defaultColor = d3.scale.category10()
    .domain(d3.range(20));

function renderHive(nodes, links, nrAxes, container, infoElement, size, color, angle) {
    size = (typeof size === "undefined") ? 300 : size;

    var width = size,
        height = size,
        innerRadius = size / 20,
        outerRadius = size / 2 - 10,
        nodeRadius = 6;

    var radius = d3.scale.linear()
        .range([innerRadius, outerRadius]);

    color = (typeof color === "undefined") ? defaultColor : color;

    var defaultAngle = d3.scale.ordinal()
        .domain(d3.range(nrAxes + 1))
        .rangePoints([0, 2 * Math.PI]);

    angle = (typeof angle === "undefined") ? defaultAngle : angle;

    var canvas = d3.select(container)
        .attr("width", width)
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    var svg = canvas.append("g")
        .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

    svg.selectAll(".axis")
        .data(d3.range(nrAxes))
        .enter().append("line")
        .attr("class", "axis")
        .attr("transform", function(d) { return "rotate(" + degrees(angle(d)) + ")"; })
        .attr("x1", radius.range()[0])
        .attr("x2", radius.range()[1]);

    svg.selectAll(".link")
        .data(links)
        .enter().append("path")
        .attr("class", "link")
        .attr("d", link()
                .angle(function(d) { return angle(d.group); })
                .radius(function(d) { return radius(d.index); }))
        .style("stroke", function(d) { return color(d.source.group); })
        .on("mouseover", linkMouseover)
        .on("mouseout", mouseout);

    var values = Object.keys(nodes).map(function(key){
        return nodes[key];
    });
    svg.selectAll(".node")
        .data(values)
        .enter().append("circle")
        .attr("class", "node")
        .attr("transform", function(d) { return "rotate(" + degrees(angle(d.group)) + ")"; })
        .attr("cx", function(d) { return radius(d.index); })
        .attr("r", nodeRadius)
        .style("fill", function(d) { return color(d.group); })
        .on("mouseover", nodeMouseover)
        .on("click", nodeClick)
        .on("mouseout", mouseout);

    var hiveInfo = canvas.append("text")
        .classed("tooltip", true)
        .attr("text-anchor", "middle")
        .style("opacity", 1e-6)
        .style("fill", "black")
        .style("font-size", 20)
        .style("font-variant", "small-caps")
        .style("text-shadow", "rgba(255, 255, 255, 1) 0px 0px 2px");

    var selectedInfo = canvas.append("text")
        .classed("tooltip", true)
        .attr("text-anchor", "middle")
        .style("opacity", 1e-6)
        .style("fill", "black")
        .style("font-size", 20)
        .style("font-variant", "small-caps")
        .style("text-shadow", "rgba(255, 255, 255, 1) 0px 0px 2px");

    var textInfo = d3.select(infoElement);

    var selected = undefined;

    // Highlight the link and connected nodes on mouseover.
    function linkMouseover(d) {
        d3.selectAll(".link").classed("active", function(p) { return p.id === d.id; });
        d3.selectAll(".node circle").classed("active", function(p) { return p.id === d.source.id || p.id === d.target.id; });
        //hiveInfo.attr("x", (d3.event.offsetX) + "px").attr("y", (d3.event.offsetY + 30) + "px");
        //hiveInfo.text(d.source.name + "→" + d.target.name).style("opacity", 1);
        textInfo.text(d.source.name + " → " + d.target.name + " [" + d.protocol + "]").style("opacity", 1);
    }

    // Highlight the node and connected links on mouseover.
    function nodeMouseover(d) {
        d3.selectAll(".link").classed("active", function(p) { return p.source.id === d.id || p.target.id === d.id; });
        d3.select(this).classed("active", true);
        //hiveInfo.attr("x", (d3.event.offsetX) + "px").attr("y", (d3.event.offsetY + 30) + "px");
        //hiveInfo.text(d.name).style("opacity", 1);
        textInfo.text(d.name).style("opacity", 1);
    }
    function nodeClick(d) {
        d3.selectAll(".link").classed("selected", false);
        d3.selectAll(".node").classed("selected", false);
        d3.selectAll(".node circle").classed("selected", false);
        selected = d;
        d3.selectAll(".link").classed("selected", function(p) { return p.source.id === d.id || p.target.id === d.id; });
        d3.select(this).classed("selected", true);
        //hiveInfo.attr("x", (d3.event.offsetX) + "px").attr("y", (d3.event.offsetY + 30) + "px");
        //hiveInfo.text(d.name).style("opacity", 1);
        selectedInfo.attr("x", (d3.event.offsetX) + "px").attr("y", (d3.event.offsetY + 30) + "px");
        selectedInfo.text(d.name).style("opacity", 1);
        textInfo.text(d.name).style("opacity", 1);
    }

    // Clear any highlighted nodes or links.
    function mouseout() {
        d3.selectAll(".active").classed("active", false);
        //hiveInfo.style("opacity", 1e-6);
        //hiveInfo.attr("x", "0px").attr("y", "0px");
        textInfo.html("&nbsp;");
    }
}

function createGroupFunction(mapping) {
    let grouping = function(name) {
        var result = 0;
        for (var key in mapping) {
            var mapped = mapping[key];
            if (typeof mapped != "undefined") {
                if (startsWith(name, key)) {
                    result = mapped;
                    break;
                }
            }
        }
        return result;
    }
    grouping.description = Array();
    for (var key in mapping) {
        var mapped = mapping[key];
        if (typeof mapped != "undefined") {
            grouping.description[mapped] =
                (typeof grouping.description[mapped] === "undefined") ?
                    key : grouping.description[mapped] + "/" + key;
        }
    }
    //if ($.inArray(0, grouping.description)) {
        //grouping.description[0] = "...";
    //}
    return grouping;
}

function renderSingleHive(data, protocol, mapping, nrAxis, element, infoText, size) {
    let nodes = {};
    let links = [];
    data.links.forEach(function(link) {
        if (link.protocol === protocol) {
            let source_name = link.source;
            let target_name = link.target;
            let source_node = data.nodes[source_name];
            let target_node = data.nodes[target_name];
            source_node.group = mapping(source_name);
            target_node.group = mapping(target_name);
            if (source_node.group != target_node.group) {
                link.source = source_node;
                link.target = target_node;
                links.push(link);
                nodes[source_name] = source_node;
                nodes[target_name] = target_node;
            }
        }
    });

    renderHive(nodes, links, nrAxis, element, infoText, size);
}
