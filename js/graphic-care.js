import 'https://cdnjs.cloudflare.com/ajax/libs/d3/7.8.2/d3.min.js';
import 'https://cdn.bootcdn.net/ajax/libs/lodash.js/4.17.21/lodash.js';
import cleanData from './clean-data.js';
import tooltip from './tooltip.js'

const MARGIN = { top: 40, bottom: 40, left: 35, right: 25 };
const FONT_SIZE = 12;
const SEC = 1000;
const DURATION = SEC * 3;
const EASE = d3.easeCubicInOut;
const LAST_TIMESTAMP = '20230101'
const MAX_WEEKS = 17;

let width = 0;
let height = 0;
let peopleData = null;
let pageviewData = null;

const $section = d3.select('#care');
const $figure = $section.select('.figure--chart');
const $ul = $figure.select('ul');

let $tip = null;

function filter({name, value}){
    const $person = $ul.selectAll('.person')
    if(name) $person.classed('is-faded', d => !d[name].includes(value))
    else $person.classed('is-faded', false)
}

function handleNameEnter(d) {
    // const datum = d.path[0].__data__
    const datum = d.toElement.__data__;
    const m = d3.pointer(event)
    const [x, y] = d3.pointer(event, this.parentNode.parentNode.parentNode);
    const pos = { x: `${x}`, y: `${y}` };
    tooltip.show({ el: $tip, d: datum, pos })
}

function updateDimensions() {
    const h = window.innerHeight;
    // height = Math.floor(h * 0.8) - MARGIN.top - MARGIN.bottom;
    // width = $chart.node().offsetWidth - MARGIN.left - MARGIN.right;
    height = 0
    width = 0
}

function resize() {
    updateDimensions();
    // $svg.attr('width', width + MARGIN.left + MARGIN.right)
    //     .attr('height', height + MARGIN.top + MARGIN.bottom);

};

function setupChart() {
    const nested = d3.groups(peopleData, d => d.week_category)
        .map(d => ({
            key: +d[0],
            values: d[1]
        }));

    const filled = d3.range(MAX_WEEKS + 1).map(i => {
        const match = nested.find(d => d.key === i);
        return match || { key: i, values: [] };
    });

    // .map(d => d.values)
    const $li = $ul
        .selectAll('.week')
        .data(filled)
        .enter()
        .append('li')
        .attr('class', 'week');

    $li.append('p')
        .attr('class', 'label')
        .html(d => {
            // const suffix = d.key === 1 ? '':'s';
            // if(d === MAX_WEEKS + 1) return `${d.key} + weeks`;
            // if(d === MAX_WEEKS + 2) return 'Never';
            // return `${d.key} week${suffix}`

            if (d.key === MAX_WEEKS) return `${d.key}+ `;
            return d.key
        });

    const $people = $li.append('ul').attr('class', 'people');

    const $person = $people.selectAll('.person')
        .data(d => d.values)
        .enter()
        .append('li')
        .attr('class', 'person')
        .on('mouseenter', handleNameEnter)
        .on('mouseleave', () => {
            tooltip.hide($tip)
        });

    $person.append('a')
        .text(d => d.name)
        .attr('href', d=> d.link)
        .attr('target', '_blank')
};

function getWeekUntilNorm(pageviews) {
    const len = pageviews.length;
    const timestamp = pageviews[len - 1];
    if (timestamp === LAST_TIMESTAMP) return null;
    return Math.floor(len / 7)
};

function getWeekCategory(week) {
    return week < MAX_WEEKS ? week : MAX_WEEKS;
}

function setupTooltip() {
    $tip = tooltip.init({ container: $ul });
    $ul.on('mouseleave', () => {
        tooltip.hide($tip)
    })
};

function loadData(people) {
    return new Promise((resolve, reject) => {
        const filenames = ['care'];
        // map() 方法返回一个新数组，数组中的元素为原始数组元素调用函数处理后的值
        // f =>f 身份函数 。 它只是返回传入的参数
        const filepaths = filenames.map(f => `assets/data/${f}.csv`);
        d3.csv(filepaths[0]).then(function (response) {
            pageviewData = cleanData.pageviews(response);
            peopleData = people.map(d => ({
                ...d,
                pageviews: pageviewData.filter(p => p.pageid === d.pageid)
            })).map(d => {
                const days_until_norm = d.pageviews.length;
                const weeks_until_norm = getWeekUntilNorm(d.pageviews);
                const week_category = getWeekCategory(weeks_until_norm)
                return {
                    ...d,
                    days_until_norm,
                    weeks_until_norm,
                    week_category
                }
            })
            resolve();
        }).catch(function (error) {
            reject(error);
        });
    })
};

// lode data
function init(people) {
    loadData(people).then(() => {
        resize();
        setupChart();
        setupTooltip();
        // setupChart2();
    });
};

export default { init, resize, filter };

