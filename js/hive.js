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

function renderHive(nodes, links, nrAxes, container, infoElement, size, angle) {
    size = (typeof size === "undefined") ? 300 : size;

    var width = size,
        height = size,
        innerRadius = size / 20,
        outerRadius = size / 2 - 10,
        nodeRadius = 6;

    var radius = d3.scale.linear()
        .range([innerRadius, outerRadius]);

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
        .attr("class", function(d) { return "link group_" + d.source.group; })
        .attr("d", link()
                .angle(function(d) { return angle(d.group); })
                .radius(function(d) { return radius(d.index); }))
        .on("mouseover", linkMouseover)
        .on("mouseout", mouseout);

    var values = Object.keys(nodes).map(function(key){
        return nodes[key];
    });
    svg.selectAll(".node")
        .data(values)
        .enter().append("circle")
        .attr("class", function(d) { return "node group_" + d.group; })
        .attr("transform", function(d) { return "rotate(" + degrees(angle(d.group)) + ")"; })
        .attr("cx", function(d) { return radius(d.index); })
        .attr("r", nodeRadius)
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
    var grouping = function(name) {
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
    var nodes = {};
    var links = [];
    data.links.forEach(function(link) {
        if (link.protocol === protocol) {
            var source_name = link.source;
            var target_name = link.target;
            var source_node = data.nodes[source_name];
            var target_node = data.nodes[target_name];
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

function calcIndices(nodes) {
    nodes.forEach(function(node) {
        var sum = 0;
        for (var i = 0; i < node.name.length; i++) {
            sum += node.name.charCodeAt(i);
        }
        //console.log(node.name + ": " + sum);
        node.index = (131 * sum % 1000) / 1000.0;
    });
    return nodes;
}

function rotate(cx, cy, x, y, radians) {
    var cos = Math.cos(radians),
        sin = Math.sin(radians),
        nx = (cos * (x - cx)) - (sin * (y - cy)) + cx,
        ny = (sin * (x - cx)) + (cos * (y - cy)) + cy;
    return [nx, ny];
};

function renderInOut(title, backlink, nodes, links, container, infoElement, size, nodeColor, linkColor) {
    var size = (typeof size === "undefined") ? 300 : size;

    var nodeRadius = 4,
        border = 10,
        width = size,
        height = size,
        innerRadius = size / 20,
        outerRadius = size / 2 - border,
        nrAxes = 3;

    var radius = d3.scale.linear()
        .range([innerRadius, outerRadius]);

    var angle = function(i) {
        var flatAngles = [0, 3 * Math.PI / 2, Math.PI];
        return flatAngles[i];
    };

    var canvas = d3.select(container)
        .attr("width", width)
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    var svg = canvas.append("g")
        .attr("transform", "translate(" + width / 2 + "," + (height / 2) + ")");

//        svg.selectAll(".axis")
//            .data(d3.range(nrAxes))
//            .enter().append("line")
//            .attr("class", "axis")
//            .attr("transform", function(d) { return "rotate(" + degrees(angle(d)) + ")"; })
//            .attr("x1", radius.range()[0])
//            .attr("x2", radius.range()[1]);

    var lines = [{x1: -width / 2, y1: 0, x2: width / 4, y2: 0}];
    svg.selectAll("line").data(lines).enter()
        .append("line")
        .classed("axis", true)
        .attr("x1", function(d){return d.x1;})
        .attr("y1", function(d){return d.y1;})
        .attr("x2", function(d){return d.x2;})
        .attr("y2", function(d){return d.y2;});

    var texts = [
        {dy: 3 * border, text: "incoming", "text-anchor": "middle", classed: "regiondesc", transform: "rotate(-90) translate(" + (height/6) + ", " + (-width/2) + ")"},
        {dy: 3 * border, text: "outgoing", "text-anchor": "middle", classed: "regiondesc", transform: "rotate(-90) translate(" + (-height/6) + ", " + (-width/2) + ")"},
        {x: -width/2, y: -height/2, dy: 3 * border, text: title, classed: "title"},
        {y: height/2, text: backlink, "text-anchor": "middle", classed: "backlink"},
    ];
    svg.selectAll("text").data(texts).enter()
        .append("text")
        .attr("x", function(d){return d.x;})
        .attr("y", function(d){return d.y;})
        .attr("dx", function(d){return d.dx;})
        .attr("dy", function(d){return d.dy;})
        .attr("transform", function(d){return d.transform;})
        .attr("text-anchor", function(d){return d["text-anchor"]})
        .attr("class", function(d){return (typeof d.classed === "undefined") ? "text" : d.classed;})
        .text(function(d){return d.text;});

    var colorList = [];
    for (var key in linkColor.colorMap) {
        colorList.push({"protocol": key, "color": linkColor.colorMap[key]});
    };
    var nrLegendKeys = colorList.length;
    var legendLineHeight = 14;
    svg.selectAll(".legend.colors").data(colorList).enter()
        .append("line")
        .classed("legend", true)
        .classed("colors", true)
        .attr("x1", function(d, i){return width / 4 + border;})
        .attr("y1", function(d, i){return -legendLineHeight * (i - nrLegendKeys/2);})
        .attr("x2", function(d, i){return width / 4 + 3 * border;})
        .attr("y2", function(d, i){return -legendLineHeight * (i - nrLegendKeys/2);})
        .attr("stroke-width", 4)
        .attr("stroke", function(d){return d.color;});
    svg.selectAll(".legend.text").data(colorList).enter()
        .append("text")
        .classed("legend", true)
        .classed("text", true)
        .attr("x", function(d, i){return width / 4 + 4 * border;})
        .attr("y", function(d, i){return -legendLineHeight * (i - nrLegendKeys/2);})
        .attr("dy", legendLineHeight / 4)
        //.attr("fill", function(d){return d.color;})
        .text(function(d){return d.protocol;});

    var scatterInOut = function(d, factor) {
        if (d.group == 1) {
            return 0;
        }
        return d.scatterfactor * factor;
    };

    var scatterAngle = function(d, factor) {
        factor = (typeof factor === "undefined") ? 1 : factor;
        return angle(d.group) + scatterInOut(d, factor);
    };

    svg.selectAll(".link")
        .data(links)
        .enter().append("path")
        .attr("class", "link")
        .attr("d", link()
                .angle(function(d) { return scatterAngle(d); })
                .radius(function(d) { return radius(d.index); }))
        .style("stroke", function(d) { return linkColor(d); })
        .on("mouseover", linkMouseover)
        .on("mouseout", mouseout);

    var nodes = svg.selectAll(".node")
        .data(nodes);
    nodes.enter().append("circle")
        .attr("class", "node")
        .attr("transform", function(d) { return "rotate(" + degrees(scatterAngle(d)) + ")"; })
        .attr("cx", function(d) { return radius(d.index); })
        .attr("r", nodeRadius)
        //.style("fill", function(d) { return nodeColor(d); })
        .on("mouseover", nodeMouseover)
        .on("click", nodeClick)
        .on("mouseout", mouseout);
    nodes.enter().append("text")
        .attr("x", function(d) {
            return rotate(0, 0, 0, -radius(d.index), scatterAngle(d))[0] + border; })
        .attr("y", function(d) {
            return rotate(0, 0, 0, -radius(d.index), scatterAngle(d))[1]; })
        .attr("dy", function(d) {
            return (d.group == 1 ? -border : 0); })
        .classed("label", true)
        .text(function(d) { return d.name; });

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

    function linkMouseover(d) {
        d3.selectAll(".link").classed("active", function(p) { return p.id === d.id; });
        d3.selectAll(".node circle").classed("active", function(p) { return p.id === d.source.id || p.id === d.target.id; });
        textInfo.text(d.source.name + " ⎯[" + d.protocol + "]→ " + d.target.name);
    }

    function nodeMouseover(d) {
        d3.selectAll(".link").classed("active", function(p) {
            return p.source.id === d.id || p.target.id === d.id;
        });
        d3.selectAll(".node").classed("active", function(n) {
            return n.id === d.id;
        });
        var text = [];
        text.push("selected: " + d.name);
        d3.selectAll(".link.active").each(function(active) {
            text.push(active.source.name + " ⎯[" + active.protocol + "]→ " + active.target.name);
        });
        textInfo.html(text.join("<br>"));
    }
    function nodeClick(d) {
        d3.selectAll(".link").classed("selected", false);
        d3.selectAll(".node").classed("selected", false);
        d3.selectAll(".node circle").classed("selected", false);
        selected = d;
        d3.selectAll(".link").classed("selected", function(p) { return p.source.id === d.id || p.target.id === d.id; });
        d3.select(this).classed("selected", true);
        selectedInfo.attr("x", (d3.event.offsetX) + "px").attr("y", (d3.event.offsetY + 30) + "px");
        selectedInfo.text(d.name).style("opacity", 1);
        textInfo.text(d.name).style("opacity", 1);
    }

    function mouseout() {
        d3.selectAll(".active").classed("active", false);
        textInfo.text("");
    }
}
