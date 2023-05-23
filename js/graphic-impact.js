import 'https://cdnjs.cloudflare.com/ajax/libs/d3/7.8.2/d3.min.js';
import cleanData from './clean-data.js';

const d3 = window.d3;

const MARGIN = { top: 400, bottom: 10, left: 35, right: 10 };
// const MARGIN = { top: 40, bottom: 40, left: 35, right: 25 };
const FONT_SIZE = 12;
const REM = 16;
const MAX_HEIGHT = FONT_SIZE * 4;
const TEXT_WIDTH = REM * 9;
const OFFSET = 0.4

let width = 0;
let height = 0;
let peopleData = null;
let pageviewData = null;
let scaleX = null;
let scaleY = null;

let $person = null;

const $section = d3.select('#impact');
const $figure = $section.select('figure');
const $chart = $figure.select('.figure__chart');
const $svg = $chart.select('svg');
const $gVis = $svg.select('.g-vis');
const $gAxis = $svg.select('.g-axis');
const $gAnnotations = $svg.select('.g-annotations');
const $toggle = $figure.select('.annotation-toggle input');

function handleToggle(){
    // The checked property sets or returns the checked state of a checkbox.
    const {checked} = this;
    $gAnnotations.classed('is-visible', checked)
}

function createAnnotation(annoData) {
    $gAnnotations.select('.g-annotation').remove();
    const $anno = $gAnnotations.append('g').attr('class', 'g-annotation')

    const types = {
        float: d3.annotationCustomType(d3.annotationLabel, {
            className: 'float',
            note: { align: 'middle', orientation: 'leftRight' }
        }),
        line: d3.annotationCustomType(d3.annotationLabel, {
            className: 'line',
            connector: { type: 'line' },
            note: { align: 'dynamic', orientation: 'leftRight' }
        })
    };

    const pad = FONT_SIZE * 0.75;

    const annotations = annoData.map(d => ({
        type: types[d.impact_type],
        note: {
            title: d.title,
            bgPadding: { top: pad, left: pad, right: pad, bottom: -pad / 2 },
            padding: 0,
            wrap: 250
        },
        data: {
            impact_index: d.impact_index,
            bin_death_index: d.bin_death_index,
            diff_percent: d.diff_percent
        },
        dx: d.dx,
        dy: d.dy
    }));

    const makeAnnotation = d3.annotation()
        .accessors({
            x: d => scaleX(d.bin_death_index),
            y: d => d.impact_index * MAX_HEIGHT * OFFSET + scaleY(d.diff_percent) 
        })
        .annotations(annotations);

    $anno.call(makeAnnotation);
}

function formatPercent(number) {
    return d3.format('.0%')(number);
}

function filter({ name, value }) {
    if (name) {
        $svg.classed('is-faded', true)
        $person.classed('is-faded', d => !d[name].includes(value));
    }
    else {
        $svg.classed('is-faded', false);
        $person.classed('is-faded', false);
    }
}

function handleMouseMove(d) {
    const $person = d3.select(this.parentNode);
    const [x] = d3.pointer(event);
    const index = Math.floor(scaleX.invert(x));
    const parentData = $person._groups[0][0].__data__
    if (index >= 30) {
        const datum = parentData.pageviews.find(p => p.bin_death_index === index);
        const f = formatPercent(datum.diff_percent);
        const y = scaleY(datum.diff_percent);
        $person
            .selectAll('.tip')
            .text(`${f}`)
            .attr('transform', `translate(${x}, ${y})`)
    }
    const pageid = parentData.pageid;
    if (pageid === '61526577') d3.select(this.parentNode).raise()
}

function handleMouseEnter(d) {
    const parentData = d3.select(this.parentNode)._groups[0][0].__data__;
    const pageid = parentData.pageid;
    $person.classed('is-active', d => d.pageid === pageid);
    $person.classed('is-inactive', d => d.pageid !== pageid);
}

function handleMouseExit() {
    d3.select(this.parentNode)
        .selectAll('.tip')
        .text('')

    const parentData = d3.select(this.parentNode)._groups[0][0].__data__;
    const pageid = parentData.pageid;
    if (pageid === '61526577') d3.select(this.parentNode).lower()
}

function handleSvgExit() {
    $person.classed('is-active', false);
    $person.classed('is-inactive', false);
}

function updateDimensions() {
    const h = window.innerHeight;
    height = MAX_HEIGHT * peopleData.length * 0.505;
    // height = MAX_HEIGHT * OFFSET * peopleData.length + MAX_HEIGHT;
    width = $chart.node().offsetWidth - MARGIN.left - MARGIN.right;
}

function resize() {
    updateDimensions();

    $svg.attr('width', width + MARGIN.left + MARGIN.right)
        .attr('height', height - 0.25 * MARGIN.top);

    $gVis.attr('transform', `translate(${MARGIN.left}, ${MARGIN.top})`);
    $gAnnotations.attr('transform', `translate(${MARGIN.left}, ${MARGIN.top})`);

    // scales
    const extent = d3.extent(pageviewData, d => d.bin_death_index);
    scaleX = d3
        .scaleLinear()
        .domain(extent)
        .range([TEXT_WIDTH + FONT_SIZE, width]);

    // const max = d3.max(datum.pageviews, v => v.diff_percent);
    const max = 70;

    scaleY = d3
        .scaleLinear()
        .domain([0, max])
        .range([MAX_HEIGHT, 0]);

    const line = d3
        .line()
        .x(d => scaleX(d.bin_death_index))
        .y(d => scaleY(d.diff_percent))
        .curve(d3.curveMonotoneX)
        .defined(d => d.ma);

    const area = d3
        .area()
        .x(d => scaleX(d.bin_death_index))
        .y0(scaleY(0))
        .y1(d => scaleY(d.diff_percent))
        .curve(d3.curveMonotoneX)
        .defined(d => d.ma);

    $person
        .select('.name')
        .attr('x', TEXT_WIDTH)
        .attr('y', scaleY.range()[0])
        .attr('text-anchor', 'end');

    $person
        .select('.after--area')
        .datum(d => d.pageviews)
        .attr('d', area)

    $person
        .select('.after--line')
        .datum(d => d.pageviews)
        .attr('d', line)

    $person
        .attr('transform', (d, i) => `translate(0, ${i * MAX_HEIGHT * OFFSET})`)

    const rectH = MAX_HEIGHT * OFFSET;
    const rectY = MAX_HEIGHT * (1 - OFFSET);
    $person
        .select('.interaction')
        .attr('width', width)
        .attr('height', rectH)
        .attr('y', rectY)

    const axis = d3
        .axisTop(scaleX)
        .tickValues([30, 60, 90, 120])
        .tickSize(height - 0.35 * MARGIN.top)
        .tickFormat((val, i) => {
            const suffix = i === 0 ? ' days after death' : ''
            return `${val}${suffix}`
        })

    $gAxis
        .select('.axis')
        .call(axis)
        .attr('transform', `translate(${MARGIN.left}, ${height - 0.32 * MARGIN.top})`)

    $gAxis
        .select('.tick')
        .select('text')
        .attr('text-anchor', 'start')

    // ANNOTATIONS
    const getDiff = d=>{
        const x = +d.impact_x;
        const match = d.pageviews.find( p=> p.bin_death_index === x)
        return match.diff_percent
    }
    const annoData = peopleData.filter(d => d.impact_annotation).map(d => {
        return {
            impact_index: d.impact_index,
            impact_type: d.impact_type,
            bin_death_index: +d.impact_x,
            diff_percent: getDiff(d),
            dx: +d.impact_x < 90 ? 30: -30,
            dy: 50,
            title: d.impact_annotation,
            padding: 0
        }
    })
    createAnnotation(annoData);
};

function setupChart() {
    // data
    peopleData.sort((a, b) => {
        const ma = d3.median(a.pageviews, v => v.diff_percent);
        const mb = d3.median(b.pageviews, v => v.diff_percent);
        return d3.descending(ma, mb)
    });

    peopleData.forEach((d, i) => d.impact_index = i)

    $svg.on('mouseleave', handleSvgExit)
    $person = $gVis.selectAll('.person');

    const $personEnter = $person
        .data(peopleData)
        .enter()
        .append('g')
        .attr('class', 'person');

    $person = $personEnter.merge($person);

    $person
        .append('text')
        .attr('class', 'name')
        .text(d => d.name)

    $person.append('path')
        .attr('class', 'after--area')

    $person.append('path')
        .attr('class', 'after--line')

    $person
        .append('text')
        .attr('class', 'tip tip--bg')
        .attr('x', 0)
        .attr('y', -FONT_SIZE / 2)
        .attr('text-anchor', 'middle');

    $person
        .append('text')
        .attr('class', 'tip tip--fg')
        .attr('x', 0)
        .attr('y', -FONT_SIZE / 2)
        .attr('text-anchor', 'middle');

    $person
        .append('rect')
        .attr('class', 'interaction')
        .attr('x', 0)
        .attr('y', 0)
        .on('mouseenter', handleMouseEnter)
        .on('mousemove', handleMouseMove)
        .on('mouseleave', handleMouseExit);

};

function setupToggle(){
    $toggle.on('change', handleToggle)
}

function loadData(people) {
    const NUM_DAYS = 91;
    return new Promise((resolve, reject) => {
        const filenames = ['impact'];
        // map() 方法返回一个新数组，数组中的元素为原始数组元素调用函数处理后的值
        // f =>f 身份函数 。 它只是返回传入的参数
        const filepaths = filenames.map(f => `assets/data/${f}.csv`);
        d3.csv(filepaths[0]).then(function (response) {
            pageviewData = cleanData.ma(response);
            peopleData = people.map(d => ({
                ...d,
                pageviews: pageviewData.filter(p => p.pageid === d.pageid)
            })).filter(d => d.pageviews.length === NUM_DAYS)
            resolve();
        }).catch(function (error) {
            reject(error);
        });
    })
};

// lode data
function init(people) {
    loadData(people).then(() => {
        updateDimensions();
        setupChart();
        setupToggle();
        resize();
    });
};

export default { init, resize, filter };

