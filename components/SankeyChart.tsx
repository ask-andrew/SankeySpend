
import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { sankey as d3Sankey, sankeyLinkHorizontal } from 'd3-sankey';
import { SankeyData } from '../types';
import { COLORS } from '../App';

interface Props {
  data: SankeyData;
  width?: number;
  height?: number;
  onNodeClick?: (nodeName: string) => void;
}

const SankeyChart: React.FC<Props> = ({ data, width = 800, height = 500, onNodeClick }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [containerWidth, setContainerWidth] = useState(width);

  // Update container width on resize
  useEffect(() => {
    const handleResize = () => {
      if (svgRef.current?.parentElement) {
        const parent = svgRef.current.parentElement as HTMLElement;
        const containerWidth = parent.clientWidth;
        // Use more available width with better constraints
        const newWidth = Math.max(800, Math.min(containerWidth - 20, 1600)); // Min 800px, max 1600px
        setContainerWidth(newWidth);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Calculate responsive dimensions - make it larger
  const responsiveHeight = Math.max(500, Math.min(700, containerWidth * 0.65)); // Min 500px, max 700px
  const effectiveWidth = containerWidth;

  useEffect(() => {
    if (!svgRef.current || !data.nodes.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 20, right: 180, bottom: 20, left: 180 };
    const innerWidth = effectiveWidth - margin.left - margin.right;
    const innerHeight = responsiveHeight - margin.top - margin.bottom;

    const sankey = (d3Sankey() as any)
      .nodeWidth(20) // Increased node width for better visibility
      .nodePadding(40) // Increased padding for cleaner separation
      .extent([[1, 1], [innerWidth - 1, innerHeight - 1]]);

    const { nodes, links } = sankey({
      nodes: data.nodes.map(d => ({ ...d })),
      links: data.links.map(d => ({ ...d }))
    });

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Use our global "Vintage Banking" color palette
    const colorScale = d3.scaleOrdinal<string>()
      .domain(data.nodes.map(n => n.name))
      .range(COLORS);

    const link = g.append("g")
      .attr("fill", "none")
      .attr("stroke-opacity", 0.7) // Slightly reduced opacity for better blending
      .selectAll("g")
      .data(links)
      .join("g")
      .style("mix-blend-mode", "multiply");

    link.append("path")
      .attr("d", sankeyLinkHorizontal())
      // Use vibrant colors from target category node
      .attr("stroke", (d: any) => colorScale(d.target.name))
      .attr("stroke-width", (d: any) => Math.max(2, d.width)) // Minimum width of 2 for visibility
      .attr("stroke-linejoin", "round") // Smoother joins
      .attr("stroke-linecap", "round"); // Rounded ends

    link.append("title")
      .text((d: any) => `${d.source.name} → ${d.target.name}\n${d.value.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}`);

    const node = g.append("g")
      .attr("font-family", "'Outfit', sans-serif")
      .selectAll("g")
      .data(nodes)
      .join("g")
      .style("cursor", (d: any) => d.name !== "Money Flow" ? "pointer" : "default")
      .on("click", (event, d: any) => {
        if (onNodeClick && d.name !== "Money Flow") onNodeClick(d.name);
      });

    node.append("rect")
      .attr("x", (d: any) => d.x0)
      .attr("y", (d: any) => d.y0)
      .attr("height", (d: any) => d.y1 - d.y0)
      .attr("width", (d: any) => d.x1 - d.x0)
      .attr("fill", (d: any) => d.name === "Money Flow" ? "#1e40af" : colorScale(d.name)) // Use vibrant blue for center
      .attr("stroke", "rgba(255,255,255,0.3)") // Light stroke for definition
      .attr("stroke-width", 1)
      .attr("rx", 3) // Slightly rounded corners

    node.append("text")
      .attr("x", (d: any) => d.x0 < innerWidth / 2 ? d.x1 + 12 : d.x0 - 12)
      .attr("y", (d: any) => (d.y1 + d.y0) / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", (d: any) => d.x0 < innerWidth / 2 ? "start" : "end")
      .attr("fill", "#1f2937") // Darker text for better contrast
      .style("font-weight", "800")
      .style("font-size", "11px") // Slightly larger text
      .style("text-transform", "uppercase")
      .style("letter-spacing", "0.05em")
      .text((d: any) => d.name)
      .append("tspan")
      .attr("fill", "#6b7280") // Softer color for amounts
      .attr("x", (d: any) => d.x0 < innerWidth / 2 ? d.x1 + 12 : d.x0 - 12)
      .attr("dy", "1.3em")
      .style("font-weight", "600")
      .text((d: any) => d.value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }));

  }, [data, effectiveWidth, responsiveHeight, onNodeClick]);

  return (
    <div className="overflow-x-visible">
      <svg ref={svgRef} width={effectiveWidth} height={responsiveHeight} className="mx-auto" />
    </div>
  );
};

export default SankeyChart;
