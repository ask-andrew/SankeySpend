
import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { sankey as d3Sankey, sankeyLinkHorizontal } from 'd3-sankey';
import { SankeyData } from '../types';

interface Props {
  data: SankeyData;
  width?: number;
  height?: number;
  onNodeClick?: (nodeName: string) => void;
}

const SankeyChart: React.FC<Props> = ({ data, width = 800, height = 500, onNodeClick }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data.nodes.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 20, right: 150, bottom: 20, left: 150 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const sankey = (d3Sankey() as any)
      .nodeWidth(20)
      .nodePadding(20)
      .extent([[1, 1], [innerWidth - 1, innerHeight - 1]]);

    const { nodes, links } = sankey({
      nodes: data.nodes.map(d => ({ ...d })),
      links: data.links.map(d => ({ ...d }))
    });

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Use a consistent color scale for both nodes and links
    const color = d3.scaleOrdinal(d3.schemeCategory10);

    const link = g.append("g")
      .attr("fill", "none")
      .attr("stroke-opacity", 0.4) // Increased opacity for "full band" look
      .selectAll("g")
      .data(links)
      .join("g")
      .style("mix-blend-mode", "multiply");

    link.append("path")
      .attr("d", sankeyLinkHorizontal())
      // COLOR BY TARGET: Use the category node's color for the link band
      .attr("stroke", (d: any) => color(d.target.name))
      .attr("stroke-width", (d: any) => Math.max(1, d.width));

    link.append("title")
      .text((d: any) => `${d.source.name} → ${d.target.name}\n${d.value.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}`);

    const node = g.append("g")
      .attr("font-family", "'Outfit', sans-serif")
      .attr("font-size", 10)
      .selectAll("g")
      .data(nodes)
      .join("g")
      .style("cursor", onNodeClick ? "pointer" : "default")
      .on("click", (event, d: any) => {
        if (onNodeClick) onNodeClick(d.name);
      });

    node.append("rect")
      .attr("x", (d: any) => d.x0)
      .attr("y", (d: any) => d.y0)
      .attr("height", (d: any) => d.y1 - d.y0)
      .attr("width", (d: any) => d.x1 - d.x0)
      .attr("fill", (d: any) => color(d.name))
      .attr("stroke", "rgba(0,0,0,0.1)")
      .attr("stroke-width", 0.5)
      .attr("rx", 3);

    node.append("text")
      .attr("x", (d: any) => d.x0 < innerWidth / 2 ? d.x1 + 10 : d.x0 - 10)
      .attr("y", (d: any) => (d.y1 + d.y0) / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", (d: any) => d.x0 < innerWidth / 2 ? "start" : "end")
      .attr("fill", "#062c1a")
      .style("font-weight", "800")
      .style("text-transform", "uppercase")
      .style("letter-spacing", "0.05em")
      .text((d: any) => d.name)
      .append("tspan")
      .attr("fill", "#8c7851")
      .attr("x", (d: any) => d.x0 < innerWidth / 2 ? d.x1 + 10 : d.x0 - 10)
      .attr("dy", "1.2em")
      .style("font-weight", "600")
      .text((d: any) => ` ${d.value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}`);

  }, [data, width, height, onNodeClick]);

  return (
    <div className="overflow-x-auto">
      <svg ref={svgRef} width={width} height={height} className="mx-auto" />
    </div>
  );
};

export default SankeyChart;
