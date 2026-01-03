
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

    const margin = { top: 10, right: 10, bottom: 10, left: 10 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const sankey = (d3Sankey() as any)
      .nodeWidth(15)
      .nodePadding(10)
      .extent([[1, 1], [innerWidth - 1, innerHeight - 6]]);

    const { nodes, links } = sankey({
      nodes: data.nodes.map(d => ({ ...d })),
      links: data.links.map(d => ({ ...d }))
    });

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const link = g.append("g")
      .attr("fill", "none")
      .attr("stroke-opacity", 0.5)
      .selectAll("g")
      .data(links)
      .join("g")
      .style("mix-blend-mode", "multiply");

    const color = d3.scaleOrdinal(d3.schemeCategory10);

    link.append("path")
      .attr("d", sankeyLinkHorizontal())
      .attr("stroke", (d: any) => color(d.source.name))
      .attr("stroke-width", (d: any) => Math.max(1, d.width));

    link.append("title")
      .text((d: any) => `${d.source.name} → ${d.target.name}\n${d.value.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}`);

    const node = g.append("g")
      .attr("font-family", "sans-serif")
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
      .attr("stroke", "#000")
      .attr("stroke-width", 0.5)
      .attr("rx", 2);

    node.append("text")
      .attr("x", (d: any) => d.x0 < innerWidth / 2 ? d.x1 + 6 : d.x0 - 6)
      .attr("y", (d: any) => (d.y1 + d.y0) / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", (d: any) => d.x0 < innerWidth / 2 ? "start" : "end")
      .attr("font-weight", "bold")
      .text((d: any) => d.name)
      .append("tspan")
      .attr("fill-opacity", 0.7)
      .attr("x", (d: any) => d.x0 < innerWidth / 2 ? d.x1 + 6 : d.x0 - 6)
      .attr("dy", "1.2em")
      .attr("font-weight", "normal")
      .text((d: any) => ` ${d.value.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}`);

  }, [data, width, height, onNodeClick]);

  return (
    <div className="overflow-x-auto">
      <svg ref={svgRef} width={width} height={height} className="mx-auto" />
    </div>
  );
};

export default SankeyChart;
