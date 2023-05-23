import 'https://cdnjs.cloudflare.com/ajax/libs/d3/7.8.2/d3.min.js';
import graphicPerspective from './graphic-perspective.js';
import graphicCare from './graphic-care.js';
import graphicChange from './graphic-change.js';
import graphicImpact from './graphic-impact.js';

const $filters = d3.select('.filters');
const $label = $filters.select('.label');
const $remove = $filters.select('.remove');
const $value = $label.select('.label__value');

function toggle() {
    const visible = !$filters.classed('is-visible');
    $filters.classed('is-visible', visible);
}

function remove() {
    $value.html('');
    $filters.classed('is-visible', false);
    $filters.classed('is-active', false);
    graphicPerspective.filter({});
    graphicCare.filter({});
    graphicChange.filter({});
    graphicImpact.filter({});
    
}

function update(){
    const $sel = d3.select(this)
    const val = $sel.text();
    const name = $sel.attr('data-name');
    $value.html(`${name}: ${val}`);
    $filters.classed('is-visible', false);
    $filters.classed('is-active', true);
    graphicPerspective.filter({name: name.toLowerCase(), value: val});
    graphicCare.filter({name: name.toLowerCase(), value: val});
    graphicChange.filter({name: name.toLowerCase(), value: val});
    graphicImpact.filter({name: name.toLowerCase(), value: val})
}

export default function init({name, data}){
    const lower = name.toLowerCase();
    const unique = _.uniqBy([].concat(...data.map(d => d[lower])));
    unique.sort(d3.ascending);
    // unique.unshift(name);

    const $ul = $filters
        .select(`.filter--${lower} ul`)
        
    $ul.selectAll('li')
        .data(unique)
        .enter()
        .append('li')
        .text(d => d)
        .attr('data-name', name)
        .on('click', update)

    $label.on('click', toggle)
    $remove.on('click', remove)
}

