// Import D3.js library
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import { Chart } from './components/Chart.js'

const { createApp } = Vue

/*
// Function to make API request
function fetchData(id) {
  // Make your API request using the provided id
  // and return the promise that resolves with the data
  return fetch(`http://localhost:8888/wp-json/vpress/v1/dummy/get/${id}`)
    .then(response => response.json())
    .then(data => data);
}

// Function to draw bar chart
function drawBarChart(data, id) {
  // Define the dimensions of the chart
  const width = 500;
  const height = 300;
  
  // Create an SVG element and append it to the body
  const svg = d3.select(`div#vpress-${id}`)
    .append('svg')
    .attr('width', width)
    .attr('height', height);
  
  // Define the scales for the x and y axes
  const xScale = d3.scaleBand()
    .domain(data.map(d => d.label))
    .range([0, width])
    .padding(0.1);
  
  const yScale = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.value)])
    .range([height, 0]);
  
  // Draw the bars
  svg.selectAll('rect')
    .data(data)
    .enter()
    .append('rect')
    .attr('x', d => xScale(d.label))
    .attr('y', d => yScale(d.value))
    .attr('width', xScale.bandwidth())
    .attr('height', d => height - yScale(d.value))
    .attr('fill', 'steelblue');
  
  // Add labels to the x axis
  svg.append('g')
    .attr('transform', `translate(0, ${height})`)
    .call(d3.axisBottom(xScale));
  
  // Add labels to the y axis
  svg.append('g')
    .call(d3.axisLeft(yScale));
}*/

window.addEventListener("DOMContentLoaded", (event) => {
  console.log("DOM fully loaded and parsed");
  d3.select('body')
    .attr('id', 'app')


  // Read HTML divs with ids in the pattern "vpress-id"
  const divs = document.querySelectorAll('[id^="vpress-"]');
  console.log('divs', divs)

  // Loop through the divs and make API requests
  divs.forEach(div => {
    const id = div.id.replace('vpress-', '');
    div.append('chart')

    /* fetchData(id)
      .then(data => {
        // Draw the bar chart using the retrieved data
        drawBarChart(data,id);
      })
      .catch(error => {
        console.error(`Error fetching data for id ${id}:`, error);
      }); */
  });

  createApp({
    components: {
      Chart
    },
    data() {
      return {
      }
    },
    computed: {
      
    },
    methods: {
      setDB(data) {
        this.db = data
      },
    },
    mounted() {
      console.log('mounted')
    }
  }).mount('#app')

});


