	
	/* 
	* If running inside bl.ocks.org we want to resize the iframe to fit both graphs
	* This bit of code was shared originally at https://gist.github.com/benjchristensen/2657838
	*/

	var margin = {top: 20, right: 0, bottom: 0, left: 0},
	width = 1200,
	height = 420 - margin.top - margin.bottom,
	formatNumber = d3.format(",d"),
	transitioning;

	/* create x and y scales */
	var global_d;
	var color = d3.scale.category20b();
	var value_index = -1;
	var color_list = new Object();

	var colores_google = function(n) {
        var colores_g = ['#1b9563','#3ba673','#23a087','#33af88','#44af36','#65bba2','#79bf22','#ceca35','#d5ad1e','#b8b26a','#cc8c27','#a5701c'];
        return colores_g[n % colores_g.length];
    }
	var x = d3.scale.linear()
		.domain([0, width])
		.range([0, width]);

	var y = d3.scale.linear()
		.domain([0, height])
		.range([0, height]);

	var treemap = d3.layout.treemap()
		.children(function(d, depth) { 
			if(d.children && d.name) {
				value_index ++;
				color_list[d.name] = colores_google(value_index);
			}
			return depth ? null : d.children; 
		})
		.sort(function(a, b) { return a.value - b.value; })
		.ratio(height / width * 0.5 * (1 + Math.sqrt(5)))
		.round(false);

	var svg = d3.select("#chart").append("svg")
		.attr("width", width + margin.left + margin.right)
		.attr("height", height + margin.bottom + margin.top)
		.style("margin-left", -margin.left + "px")
		.style("margin.right", -margin.right + "px")
		.append("g")
		.attr("transform", "translate(" + margin.left + "," + margin.top + ")")
		.style("shape-rendering", "crispEdges");

	d3.json("test.json", function(root) {
		initialize(root);
		accumulate(root);
		layout(root);
		display(root);

		function initialize(root) {
			root.x = root.y = 0;
			root.dx = width;
			root.dy = height;
			root.depth = 0;
		}

		function accumulate(d) {
			return d.children ? d.value = d.children.reduce(function(p, v) { return p + accumulate(v); }, 0) : d.value;
		}

		function layout(d) {
			if (d.children) {
				treemap.nodes({children: d.children});
				d.children.forEach(function(c) {
					c.x = d.x + c.x * d.dx;
					c.y = d.y + c.y * d.dy;
					c.dx *= d.dx;
					c.dy *= d.dy;
					c.parent = d;
					layout(c);
				});
			}
		}

		function display(d) {

			var g1 = svg.insert("g", ".grandparent")
				.datum(d)
				.attr("class", "depth");

			var g = g1.selectAll("g")
				.data(d.children)
				.enter().append("g");
				
			g.filter(function(d) { return d.children; })
				.classed("children", true)
				.on("click", function(d){
					global_d = d;
					transition(d);
				});

			g.selectAll(".child")
				.data(function(d) { return d.children || [d]; })
				.enter().append("rect")
				.attr("class", "child")
				.call(rect)
				.style("fill", function(d) {
					if(d.children){
						return null; 
					}else{
						return color_list[d.parent.name]; 
					}
				})
				.append("title")
				.text(function(d) { return d.name + " " + formatNumber(d.size); });
				   
			g.append("rect")
				.attr("class", "parent")
				.call(rect)
				.on("click", function(d) { 
					if(!d.children){
						transition(d.parent.parent)
					}
				})
				.style("fill", function(d) {
					if(d.children){
						return null; 
					}else{
						return color_list[d.parent.name]; ; 
					}
				})
				.append("title")
				.text(function(d) { return d.name + " " + formatNumber(d.size); });

			g.append("foreignObject")
				.call(rect)
				.on("click", function(d) { 
					if(!d.children){
						transition(d.parent.parent);
					}
				})
				.attr("class","foreignobj")
				.append("xhtml:div") 
				.attr("dy", ".75em")
				.html(function(d) { 
					return d.name; 
				})
				.attr("class","textdiv");

			//监听全局
			d3.select(window).on("click", function() {transition(global_d.parent);});


			function transition(d) {
				if (transitioning || !d) return;
				transitioning = true;

				var g2 = display(d),
				t1 = g1.transition().duration(750),
				t2 = g2.transition().duration(750);

				x.domain([d.x, d.x + d.dx]);
				y.domain([d.y, d.y + d.dy]);

				svg.style("shape-rendering", null);

				svg.selectAll(".depth").sort(function(a, b) { return a.depth - b.depth; });

				g2.selectAll("text").style("fill-opacity", 0);
				g2.selectAll("foreignObject div").style("display", "none"); 

				t1.selectAll("text").call(text).style("fill-opacity", 0);
				t2.selectAll("text").call(text).style("fill-opacity", 1);
				t1.selectAll("rect").call(rect);
				t2.selectAll("rect").call(rect);

				t1.selectAll(".textdiv").style("display", "none");
				t1.selectAll(".foreignobj").call(foreign); 
				t2.selectAll(".textdiv").style("display", "block"); 
				t2.selectAll(".foreignobj").call(foreign);

				t1.remove().each("end", function() {
					svg.style("shape-rendering", "crispEdges");
					transitioning = false;
				});

			}
			return g;
		}

		function text(text) {
			text.attr("x", function(d) { return x(d.x) + 6; })
				.attr("y", function(d) { return y(d.y) + 6; });
		}

		function rect(rect) {
			rect.attr("x", function(d) { return x(d.x); })
				.attr("y", function(d) { return y(d.y); })
				.attr("width", function(d) { return x(d.x + d.dx) - x(d.x); })
				.attr("height", function(d) { return y(d.y + d.dy) - y(d.y); })
		}

		function foreign(foreign){ /* added */
			foreign.attr("x", function(d) { return x(d.x); })
				.attr("y", function(d) { return y(d.y); })
				.attr("width", function(d) { return x(d.x + d.dx) - x(d.x); })
				.attr("height", function(d) { return y(d.y + d.dy) - y(d.y); });
		}

		function name(d) {
			return d.parent ? name(d.parent) + "." + d.name : d.name;
		}
	});