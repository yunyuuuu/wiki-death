import cleanData from './clean-data.js';
import 'https://cdnjs.cloudflare.com/ajax/libs/d3/7.8.2/d3.min.js';

let peopleData = null;

const $section = d3.select('#change');
const $figure = $section.select('figure');
const $table = $figure.select('table');
const $tbody = $table.select('tbody');
const $btn = $section.select('.btn')

function filter({name, value}){
    const $person = $tbody.selectAll('tr')
    if(name) $person.classed('is-faded', d => !d[name].includes(value))
    else $person.classed('is-faded', false)
}

function formatComma(number) {
    return d3.format(',')(Math.round(number))
}

function formatPercent(number) {
    return d3.format(',.0%')(number);
}

function setupChart() {
    peopleData.sort((a, b) => d3.descending(a.change, b.change));
    // peopleData.sort((a, b) => d3.ascending(a.canonical, b.canonical));
    const extent = d3.extent(peopleData, d => Math.sqrt(d.change));
    const scale = d3.scaleLinear().domain(extent).range([0, 0.9])

    const $tr = $tbody
        .selectAll('tr')
        .data(peopleData)
        .enter()
        .append('tr')

    const $name = $tr.append('td').attr('class', 'name')

    $name
        .append('a')
        .text(d => d.name)
        .attr('href', d => d.link)
        .attr('target', '_blank')

    $name.append('span').text(d => d.description.slice(0, d.description.indexOf('(')))

    $tr
        .append('td')
        .attr('class', 'avg number')
        .text(d => formatComma(d.median_views_adjusted_bd_2));

    $tr
        .append('td')
        .attr('class', 'death number')
        .text(d => formatComma(d.death_views_adjusted_2));

    $tr
        .append('td')
        .attr('class', 'change number')
        .text((d, i) => {
            const f = formatPercent(d.change);
            return f.replace('%', '')
        })
        .style('background-color', d => `rgba(91, 91, 91, ${scale(Math.sqrt(d.change))})`);

}

function setupFilter() {
    const industries = [].concat(...peopleData.map(d => d.industry));
}

function setupToggle() {
    $btn.on('click', () => {
        const truncated = $figure.classed('is-truncated');
        const text = truncated ? 'Show fewer' : 'Show more';
        $btn.text(text);
        $figure.classed('is-truncated', !truncated);

        if (!truncated) {
            const y = +$btn.attr('data-y');
            window.scrollTo(0, y)
        }

        $btn.attr('data-y', window.scrollY)
        $figure.select('.show-more').classed('is-visible', !truncated)
    })
}

function loadData(people) {
    return new Promise((resolve, reject) => {
        peopleData = people.map(d => ({
            ...d,
            change: d.death_views_adjusted_2 / d.median_views_adjusted_bd_2
        }))
        resolve();
    })
};

function resize() {
    // theadHeight = $table.select('thead').node().offsetHeight;
}

function init(people) {
    loadData(people).then(() => {
        resize();
        setupChart();
        setupFilter();
        setupToggle();
    });
}

export default { init, filter };