	
var units = "users";

var highestValue = 0;
var smallFontThreshold = 30;
var daus, activations

var w, d, e, g, x, y, margin, width, height
var graph; 
var testervar;
var m = 50
var isFocused = false
var color;

readWindowSize()

// append the svg canvas to the page
var svg = d3.select("#chart").append("svg")
    // .attr("width", width + margin.left + margin.right)
    // .attr("height", height + margin.top + margin.bottom)
    
    .attr("width", width)
    .attr("height", height + margin.bottom)

  .append("g")
    .attr("transform", "translate(0,35)")

// Set the sankey diagram properties
var sankey = d3.sankey()
    .nodeWidth(20)
    .nodePadding(20)
    .size([width, height])
    .align("left");

var path = sankey.link();

// load the data (using the timelyportfolio csv method)
d3.csv("sankey.csv", handleData)

function handleData(error, data){
    //set up graph in same style as original example but empty
      graph = {"nodes" : [], "links" : []};

      data.forEach(function (d) {      
        graph.nodes.push({ "name": d.source,
                          });
        graph.nodes.push({ "name": d.target, 
                            });
        graph.links.push({ "source": d.source,
                          "target": d.target,
                          "value": d.value                         
                          });
            if (d.value > highestValue) {
                highestValue = d.value;          
            }       
          });
          
        // return only the distinct / unique nodes
          graph.nodes = d3.keys(d3.nest()
                                .key(function (d) { return d.name; })
                                .object(graph.nodes));
          graph.nodes.forEach(function (d, i) {              
              graph.nodes[i] = { "name": d };  // count of collapsed parent nodes
              graph.nodes[i].focused = false;              
          }); 

        graph.links.forEach(function(e) {            
            e.source = graph.nodes.filter(function(n) {
                  return n.name === e.source;
                })[0],
            e.target = graph.nodes.filter(function(n) {
                  return n.name === e.target;
                })[0];  
       });
update() // first update
}


var nodes, links

function update() {
     color = d3.scaleLinear()
    .domain([1, graph.nodes.length/2, graph.nodes.length])
    .range(["darkblue", "purple", "darkred"])
    .interpolate(d3.interpolateHcl);

   nodes = graph.nodes.filter(function(d) {
    if(isFocused){ return d.focused } else { return true;}
  });

  links = graph.links.filter(function(d) {
    if (isFocused) { return d.target.focused && d.source.focused
     } else {
        return true; }
  });

  sankey
    .nodes(nodes)
    .links(links)
    .layout(32);

// get activations and daus so we can calculate % 
  var notDaus = 0
  nodes.forEach(function(n){
      if(n.name == "Not DAU"){ notDaus = n.value }
      if(n.name=="DAU"){ daus = n.value }
  })
  activations = daus + notDaus

  svg.selectAll("g").remove();
  sankey.align("center").layout(32);
  sankeyGen();
}

function sankeyGen(){
    var div = d3.select("body").append("div")	
        .attr("class", "tooltip")				
        .style("opacity", 0);

      ////// LINKS //////
      //
      // ENTER the links
      var link = svg.append("g").selectAll(".link")
          .data(links)
          .enter()
          .append("path")
          .attr("id", function(d,i){d.id = i;return "link-"+i;})
          .attr("class", "link")
          .attr("d", path)
          .style("stroke-width", function(d) { return Math.max(1, d.dy); })          

          .style("stroke", function(d, i){return color(i)})

          .sort(function(a, b) { return b.dy - a.dy; });
        
    // add the link titles
      link.append("title")
            .text(function(d) {
            return d.source.name + " → " + 
                    d.target.name + "\n" + format(d.value)             
                  });

        ////// NODES //////
        //
        // ENTER the nodes
      var node = svg.append("g").selectAll(".node")
          .data(nodes)
        .enter().append("g")

        .on("click", tagSelfAndChildNodes)
          .attr("class", "node")             
          .attr("id", function(d,i){d.id = i;return "node-"+i;})       
          .attr("transform", function(d) { 
          return "translate(" + d.x + "," + d.y + ")"; })

            //// Drag the nodes ////
            .call(d3.drag()
            .subject(function(d) { return d; })
            .on("start", function() { //this.parentNode.appendChild(this);
            })
            .on("drag", dragmove)
            );

    // add the rectangles for the nodes
      node.append("rect")      
          .style("fill", function(d, i){return color(i)})
          .attr("height", function(d) { return d.dy; })
          .attr("width", sankey.nodeWidth())
          .append("title")
          .text(function(d) { 
                return d.name + "\n" 
                + format(d.value) + "\n"
                + pctOfDaus(d.value) + " of DAUs are " + d.name + " DAUs" + "\n"
                + pctOfActivations(d.value) + " of activations are " + d.name + " DAUs" + "\n"
                ; });

    // MAIN TITLE
    //    
    // add in the big title for the nodes 
      node.append("text")
          .attr("class", function(d,i){
              if(this.parentNode.getBoundingClientRect().height > smallFontThreshold) {
                return "node-title"
              } else {
                return "node-title-small"
              }
          })
          .attr("x", -6)
          .attr("y", function(d) { return d.dy / 2; })
          .attr("dy", ".35em")
          .attr("text-anchor", "end")
          .attr("transform", null)
          
          .text(function(d, i) { 
            if(this.parentNode.getBoundingClientRect().height > smallFontThreshold) {
              return d.name
            } else {
              var val = d3.format(".2s")(d.value)    
              var pct = pctOfParent(d)
              return d.name + " " + pct   // TODO - functions for finding pct, oneinwhat, value, etc
            }  
          })


        .filter(function(d) { return d.x < width / 2; })
          .attr("x", 6 + sankey.nodeWidth())
          .attr("text-anchor", "start")      
          ;

    // SUBTITLE
    //
    // add the value below the node name
    
      node.append("text")
          .attr("class", function(d,i){

              // if we don't have enough space to show a second line, don't.
              var enoughSpace = this.parentNode.getBoundingClientRect().height > smallFontThreshold              
              var motherNode = (i == 0)
              var isNotAFocusedMother = !(motherNode && isFocused)
              
              if(enoughSpace && isNotAFocusedMother) { // focused mothers will be calculated wrongly
                return "node-value"
              } else {
                return "node-value-small" // means invisible. Maybe it should just float next to the label instead?
              }
          })
          .attr("x", -6)            
          .attr("y", function(d) {           
              var spacing = 30              
              // at 1186 it should be 60
              // at 680 it should be 30
              spacing = map_range(height, 680, 1200, 35, 60)              
            return d.dy / 2 + spacing;  // todo: avoid clashes                    
          })
          .attr("dy", ".35em")
          .attr("text-anchor", "end")
          .attr("transform", null)             
    .text(function(d) { 
            var val = d3.format(".2s")(d.value)                  
            return val + "  " + pctOfParent(d) // TODO 1 in what
            })

        .filter(function(d) { return d.x < width / 2; })
          .attr("x", 6 + sankey.nodeWidth())
          .attr("text-anchor", "start")      
          ; 
          
    // the function for moving the nodes
      function dragmove(d) {
        d3.select(this)
          .attr("transform",
            "translate(" + d.x + "," + (d.y = Math.max(0, Math.min(height - d.dy, d3.event.y))) + ")");
        sankey.relayout();
        link.attr("d", path);
      }


function tagSelfAndChildNodes(node,i){
    unfocusAllNodes()
    
    showResetButton(node.name)

    var remainingNodes=[],
        nextNodes=[];

    // handle the immediate children    
    node.sourceLinks.forEach(function(link) {   // let's look at the links pointing to this one
        remainingNodes.push(link.target);       // add all the targets to remainingNodes
        node.focused = true
    });

    // handle the rest of their children
    while (remainingNodes.length) {
        nextNodes = [];
        remainingNodes.forEach(function(node) {        
            node.focused = true
        node.sourceLinks.forEach(function(link) {
            nextNodes.push(link.target);                     
        });
        });
        remainingNodes = nextNodes;
    }
            
        // enter focused mode. update() looks for this
        isFocused = true
        update()
    }  // onclick - tag self and child node()
        
      function tagLinkForFocus(id){
        var l = d3.select("#link-"+id)        
      }
      
      function highlight_node(id){
        // just using this to confirm that we have the right selection
        // d3.select("#node-"+id).style("opacity", "0.1");

      }

        function highlight_link(id,opacity){
      d3.select("#link-"+id).style("stroke-opacity", opacity);
  }

} // sankeygen

/////
// EVEN MORE HANDY FUNCTIONS 
/////

function pctOfDaus(d){
    var precisePct = d/daus
    return d3.format(".0%")(precisePct)
}

function pctOfActivations(d){
    var precisePct = d/activations
    return d3.format(".0%")(precisePct)
}

function pctOfParent(d) {
    if(d.targetLinks.length > 0){
        var parent = d.targetLinks[0].source
        var pctOfParent = ((d.value / parent.value))
        pctOfParentLabel = d3.format(".0%")(pctOfParent)
        return pctOfParentLabel
    }
    return ""
}

function showResetButton(title){
    removeResetButton()
    d3.select("body")
        .append("div")
        .attr("id", "reset-button")
        .html(title+" ✖ ")
        .attr("class", "reset-button")
        .on("click", resetChart)
}

function removeResetButton(){
    d3.select("#reset-button").remove()
}

function resetChart(){
    removeResetButton()
    unfocusAllNodes()
    update()    
}

function unfocusAllNodes(){
    isFocused = false
    graph.nodes.forEach(function(n){
        n.focused=false;
    })
}

window.onresize = function(event){
  console.log("resized")
}

function readWindowSize(){
    w = window
    d = document
    e = d.documentElement
    g = d.getElementsByTagName('body')[0]
    x = w.innerWidth || e.clientWidth || g.clientWidth
    y = w.innerHeight|| e.clientHeight|| g.clientHeight
    margin = {top: m, right: m, bottom: m, left: m}
    width = x - margin.left - margin.right
    height = y - margin.top - margin.bottom;
}



var formatNumber = d3.format(",.0f"),    // zero decimal places
    format = function(d) { return formatNumber(d) + " " + units; }
    // ,
    // color = d3.scale.category20();

function map_range(value, low1, high1, low2, high2) {
    return low2 + (high2 - low2) * (value - low1) / (high1 - low1);
}