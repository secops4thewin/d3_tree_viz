/*
 * Visualization source
 */
define([
            'jquery',
            'underscore',
            'api/SplunkVisualizationBase',
            'api/SplunkVisualizationUtils',
            'd3'
            // Add required assets to this list
        ],
        function(
            $,
            _,
            SplunkVisualizationBase,
            SplunkVisualizationUtils,
            d3,
            vizUtils
        ) {
  
    // Extend from SplunkVisualizationBase
    return SplunkVisualizationBase.extend({
  
        initialize: function() {
            SplunkVisualizationBase.prototype.initialize.apply(this, arguments);
            this.$el = $(this.el);

             // Add a css selector class
            this.$el.addClass('splunk-forcedirected-meter');
            
            // Initialization logic goes here
        },

        // Optionally implement to format data returned from search. 
        // The returned object will be passed to updateView as 'data'
        formatData: function(data) {

            // Format data 

            return data;
        },
  
        // Implement updateView to render a visualization.
        //  'data' will be the data object returned from formatData or from the search
        //  'config' will be the configuration property object
        updateView: function(data, config) {

            // Guard for empty data
            if(data.rows.length < 1){
                return;
                    }
                 // Take the first data point
            datum = data.rows;

            // Get color config or use a default yellow shade
           // var themeColor = config[this.getPropertyNamespaceInfo().propertyNamespace + 'theme'] || 'light';

            //Adjust background depending on color theme
            //var svgColour = backgroundColour(themeColor);
            
            //Adjust text fill depending on color theme
            //var stringFill = stringColour(themeColor);
            
            // Clear the div
            this.$el.empty();

            //Specify a radius, this is used to ensure nodes do not overlap.
            var radius = 12;

            //Specify a width and height that matches the Splunk console
            var width = this.$el.width();
            var height = this.$el.height();
            var margin = {top: 20, right: 20, bottom: 20, left: 100};

            var svg = d3.select(this.el)
            .append("svg")
            .attr("width", width + margin.right + margin.left)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
             .attr("transform", "translate("
          + margin.left + "," + margin.top + ")")
            .call(d3.zoom().on("zoom", function () {
            svg.attr("transform", d3.event.transform)}))
            .append("g");

var duration = 750,
    root;

// declares a tree layout and assigns the size
var treemap = d3.tree()
    .size([height, width]);
   // .nodeSize([30,])
   // .separation(function separation(a, b) {
        // return a.parent == b.parent ? 2 : 1;
   // });

// Create empty tree Data array
  treeData = [];

//Set the index Number to 0 so that we have a unique identifier for each record
  indexNumber = 0

//Push the root node to the list
   treeData.push(
            { parent : null,
              name : "root",
              id : indexNumber
          });
//Iterate the index number
   indexNumber++

  //For Each Row in datum
  datum.forEach(function(nodeName){
    x = 0;
    //Search the parent field to see if it exists in the name field, 
    parent = nodeName[0]
    child = nodeName[1]

    //Check to see that the parent does not exist in the link
    var x = checkNoParentExists(datum,parent);

    //If there is no parent
    if (x === false){

      var returnedResult = functiontofindIndexByKeyValue(treeData, parent);
          //if it the parent does not exist in the treeData array
          if(returnedResult == null){
            //Push the unique parent to the treeData array
      treeData.push(
            { parent : "root",
              name : parent,
              id : indexNumber
          });

        }
        }
      //Push the unique parent to the treeData array
        treeData.push(
            { parent : parent,
              name : child,
              id : indexNumber
          });
     
});


var treeDataMap = d3.stratify()
    .id(function(d) { return d.name; })
    .parentId(function(d) { return d.parent; })
    (treeData);
 
// assign the name to each node
treeDataMap.each(function(d) {
   d.name = d.id;
   });


// Assigns parent, children, height, depth
root = d3.hierarchy(treeDataMap, function(d) {
  return d.children; });
root.x0 = height / 2;
root.y0 = 80;

// Collapse after the second level
root.children.forEach(collapse);

update(root);

// Collapse the node and all it's children
function collapse(d) {
  if(d.children) {
    d._children = d.children
    d._children.forEach(collapse)
    d.children = null
  }
}

function update(source) {
 var i=0;
  var levelWidth = [1];
  var childCount = function(level, n) {

  if(n.children && n.children.length > 0) {
    if(levelWidth.length <= level + 1) levelWidth.push(0);

    levelWidth[level+1] += n.children.length;
    n.children.forEach(function(d) {
      childCount(level + 1, d);
    });
  }
};

childCount(0, root); 

var newHeight = d3.max(levelWidth) * 20; // 20 pixels per line  

var treemap = d3.tree()
    .size([newHeight, width])
//tree = tree.size([newHeight, width]);
  // Assigns the x and y position for the nodes
  var treeData = treemap(root);

  // Compute the new tree layout.
  var nodes = treeData.descendants(),
      links = treeData.descendants().slice(1);

  // Normalize for fixed-depth.
  nodes.forEach(function(d){ d.y = d.depth * 160});

  // ****************** Nodes section ***************************

  // Update the nodes...
  var node = svg.selectAll('g.node')
      .data(nodes, function(d) {return d.id || (d.id = ++i); });

  // Enter any new nodes at the parent's previous position.
  var nodeEnter = node.enter().append('g')
      .attr('class', 'node')
      .attr("transform", function(d) {
        return "translate(" + source.y0 + "," + source.x0 + ")";
    })
    .on('click', click);

  // Add Circle for the nodes
  nodeEnter.append('circle')
      .attr('class', 'node')
      .attr('r', 1e-6)
      .style("fill", function(d) {
          return d._children ? "lightsteelblue" : "#fff";
      });

  // Add labels for the nodes
  nodeEnter.append('text')
      .attr("dy", ".35em")
      .attr("x", function(d) {
          return d.children || d._children ? -13 : 13;
      })
      .attr("text-anchor", function(d) {
          return d.children || d._children ? "end" : "start";
      })
      .text(function(d) { return d.data.name; });

  // UPDATE
  var nodeUpdate = nodeEnter.merge(node);

  // Transition to the proper position for the node
  nodeUpdate.transition()
    .duration(duration)
    .attr("transform", function(d) { 
      //Put Nodes in correct position
        return "translate(" + d.y + "," + d.x + ")";
     });

  // Update the node attributes and style
  nodeUpdate.select('circle.node')
    .attr('r', 10)
    .style("fill", function(d) {
        return d._children ? "lightsteelblue" : "#fff";
    })
    .attr('cursor', 'pointer');


  // Remove any exiting nodes
  var nodeExit = node.exit().transition()
      .duration(duration)
      .attr("transform", function(d) {
          return "translate(" + source.y + "," + source.x + ")";
      })
      .remove();

  // On exit reduce the node circles size to 0
  nodeExit.select('circle')
    .attr('r', 1e-6);

  // On exit reduce the opacity of text labels
  nodeExit.select('text')
    .style('fill-opacity', 1e-6);

  // ****************** links section ***************************

  // Update the links...
  var link = svg.selectAll('path.link')
      .data(links, function(d) { return d.id; });

  // Enter any new links at the parent's previous position.
  var linkEnter = link.enter().insert('path', "g")
      .attr("class", "link")
      .attr('d', function(d){
        var o = {x: source.x0, y: source.y0}
        return diagonal(o, o)
      });

  // UPDATE
  var linkUpdate = linkEnter.merge(link);

  // Transition back to the parent element position
  linkUpdate.transition()
      .duration(duration)
      .attr('d', function(d){ return diagonal(d, d.parent) });

  // Remove any exiting links
  var linkExit = link.exit().transition()
      .duration(duration)
      .attr('d', function(d) {
        var maxX = Math.max(radius, Math.min(width - radius, source.x));
        var maxY = Math.max(radius, Math.min(height - radius, source.y));
        var o = {x: maxX, y: maxY}
        //var o = {x: source.x, y: source.y}
        return diagonal(o, o)
      })
      .remove();

  // Store the old positions for transition.
  nodes.forEach(function(d){
    d.x0 = d.x;
    d.y0 = d.y;
  });

  // Creates a curved (diagonal) path from parent to the child nodes
  function diagonal(s, d) {

    path = `M ${s.y} ${s.x}
            C ${(s.y + d.y) / 2} ${s.x},
              ${(s.y + d.y) / 2} ${d.x},
              ${d.y} ${d.x}`

    return path
  }

  // Toggle children on click.
  function click(d) {
    if (d.children) {
        d._children = d.children;
        d.children = null;
      } else {
        d.children = d._children;
        d._children = null;
      }
    update(d);
  }
}

//Declare Functions Below

 function functiontofindIndexByKeyValue(arraytosearch, valuetosearch) {
for (var i = 0; i < arraytosearch.length; i++) {
   if (arraytosearch[i]["parent"] == "root" && arraytosearch[i]["name"] == valuetosearch) {
return i;
}
}
return null;
}

function checkNoParentExists(arr, val) {
  return arr.some(function(arrVal) {
    return val === arrVal.name;
  });
}

   
        },

        // Search data params
        getInitialDataParams: function() {
            return ({
                outputMode: SplunkVisualizationBase.ROW_MAJOR_OUTPUT_MODE,
                count: 1000
            });
        },

        // Override to respond to re-sizing events
        reflow: function() {}
    });
});