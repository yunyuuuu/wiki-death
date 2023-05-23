import 'https://cdnjs.cloudflare.com/ajax/libs/scrollama/3.2.0/scrollama.js';
import 'https://cdnjs.cloudflare.com/ajax/libs/stickyfill/2.1.0/stickyfill.min.js';
import cleanData from './clean-data.js';
// import 'https://cdn.jsdelivr.net/npm/d3-delaunay@6';
import tooltip from './tooltip.js'

const d3 = window.d3;

const MARGIN = { top: 20, bottom: 40, left: 50, right: 50 };
const FONT_SIZE = 12;
const KOBE_ID = '246185'
const DATE_DEC = new Date(2019, 11, 1);
const DATE_FEB = new Date(2020, 0, 27);
const MIN_R = 3;
const MAX_R = 14;
const SEC = 1000;
const DURATION = SEC * 3;
const EASE = d3.easeCubicInOut;
const HEADER_HEIGHT = d3.select('header').node().offsetHeight;

let width = 0;
let height = 0;
let peopleData = null;
let pageviewData = null;
let billieData = null;
let currentStep = 'context';
let hoverEnabled = false;

let $tip = null;

const $section = d3.select('#perspective');
const $article = $section.select('article');
const $step = $article.selectAll('.step');
const $figure = $section.select('figure');
const $chart = $figure.select('.figure__chart');
const $svg = $chart.select('svg');
const $gVis = $svg.select('.g-vis');
const $gAxis = $svg.select('.g-axis');
const $gVor = $svg.select('.g-voronoi');
const $people = $gVis.select('.people');
const $legend = $figure.select('.legend');
const $filter = d3.select('.filters')

const scroller = scrollama();
const scrollerHover = scrollama();

function filter({name, value}){
    const $person = $people.selectAll('.person');
    if(name) $person.classed('is-faded', d => !d[name].includes(value));
    else $person.classed('is-faded', false);
}

// help functions
function getScaleX(data = billieData[0].pageviews) {
    // scale
    return d3.scaleTime()
        .domain(d3.extent(data, d => d.date))
        .nice()
        .range([10, width - 10]);
};

function getScaleY(data = billieData[0].pageviews) {
    const maxY = d3.max(data, d => d.views_adjusted);

    return d3.scaleLinear()
        .domain([0, maxY])
        .nice()
        .range([height, 0]);
};

function getScaleR(data) {
    return d3.scaleSqrt()
        .domain(d3.extent(data, d => d.death_views_adjusted_2))
        .nice()
        .range([MIN_R, MAX_R]);
};

function getLine({ scaleX, scaleY }) {
    //line fuction
    // line() make a curve according to dots
    return d3.line()
        .x(d => scaleX(d.date))
        .y(d => scaleY(d.views_adjusted))
        .curve(d3.curveMonotoneX)
        .defined(d => d.views_adjusted);  // decide which data should exist
};

function updateAxis({ scaleX, scaleY, dur, ticks = d3.timeMonth.every(1), len = 8 }) {
    //axis
    const axisY = d3.axisLeft(scaleY)
        .tickFormat((val, i) => {
            const formatted = d3.format('.2s')(val)
            const suffix = i === len ? 'adjusted pageviews' : ''
            return `${formatted} ${suffix}`
        })
        .tickSize(-(width + MARGIN.left))
        .tickPadding(MARGIN.left);

    $gAxis.select('.axis--y')
        .transition()
        .duration(dur.slow)
        .ease(EASE)
        .call(axisY)
        .attr('transform', `translate(${MARGIN.left}, ${MARGIN.top})`);

    $gAxis
        .selectAll('.axis--y text')
        .attr('text-anchor', 'start')
        .attr('y', -FONT_SIZE / 2);

    $gAxis
        .selectAll('.axis--y line')
        .attr('transform', `translate(${-MARGIN.left}, 0)`);

    function multiFormat(date) {
        return (d3.timeYear(date) < date
            ? d3.timeFormat('%b')
            : d3.timeFormat('%Y'))(date);
    };

    const axisX = d3.axisBottom(scaleX)
        .ticks(ticks)
        .tickSize(0)
        .tickPadding(0)
        .tickFormat(multiFormat);

    $gAxis.select('.axis--x')
        .transition()
        .duration(dur.slow)
        .ease(EASE)
        .call(axisX)
        .attr('transform', `translate(${MARGIN.left}, ${height + MARGIN.top + FONT_SIZE})`);
};

function resetLine($person, offset) {
    const $path = $person.selectAll('path');

    const totalLength = $path.node().getTotalLength();
    const dashOffset = offset ? totalLength - offset : totalLength;

    // 是将整条线条的边框线都转化为虚线，并将它们全部向左移动，从而隐藏整条线条。
    $path.attr('stroke-dasharray', `${totalLength} ${totalLength}`)
        .attr('stroke-dashoffset', dashOffset);
};

function enterPerson($person) {
    $person.attr('data-id', d => d.pageid);
    $person.append('path');
    $person.append('g')
        .attr('class', 'circles');
    $person
        .append('text')
        .attr('class', 'bg')
        .text(d => d.name)
        .attr('x', 0)
        .attr('y', FONT_SIZE)
        .attr('text-anchor', 'middle')
        .attr('alignment-baseline', 'middle')
        .style('opacity', 0)

    $person
        .append('text')
        .attr('class', 'fg')
        .text(d => d.name)
        .attr('x', 0)
        .attr('y', FONT_SIZE)
        .attr('text-anchor', 'middle')
        .attr('alignment-baseline', 'middle')
        .style('opacity', 0)
}

function exitPerson($person, dur) {
    $person
        .exit()
        transition()
        .duration(dur)
        .style('opacity', 0)
        .remove()
}

function enterCircles($person, { scaleX, scaleY, r = MIN_R }) {
    const $c = $person
        .select('.circles')
        .selectAll('circle')
        .data(d => d.pageviews.filter(
            p => ['billie', KOBE_ID]
                .includes(p.pageid) || p.bin_death_index === 0),
            k => k.timestamp);

    const $enter = $c.enter()
        .append('circle')
        .classed('is-not-death-index', d => d.bin_death_index !== 0)
        .attr('cx', 0)
        .attr('cy', 0)
        .attr('r', r)
        .attr(
            'transform',
            d => `translate(${scaleX(d.date)}, ${scaleY(d.views_adjusted)})`);

    $enter.merge($c)
        .attr('data-x', d => scaleX(d.date))
        .attr('data-y', d => scaleY(d.views_adjusted));

    $c.exit().remove();
};

function updatePath($person, { scaleX, scaleY, render = true }) {
    const line = getLine({ scaleX, scaleY });
    $person.selectAll('path').data(d => [d.pageviews]);

    if (render) $person.selectAll('path').attr('d', line);

}

function trimPageviews(pageviews, { start = -1, end = 0 }) {
    return pageviews
        .map(p => ({ ...p }))
        .filter(p => p.bin_death_index >= start && p.bin_death_index <= end);
};

function findKobeStart(date) {
    const data = peopleData.find(d => d.pageid === KOBE_ID).pageviews;

    const views = data.map((d, i) => ({ i, date: d.date, diff: d.date - date }));
    const filtered = views.filter(d => d.diff >= 0)
    return data[filtered[0].i].bin_death_index;
};

function getDuration({ leave, reverse }) {
    let factor = 1
    if (leave) factor = 0
    else if (reverse) factor = 0.33
    const slow = DURATION * factor;
    const medium = Math.floor(slow * 0.33);
    const fast = Math.floor(slow * 0.1);
    return {
        slow, medium, fast
    }
};

function handleVorEnter(d) {
    if (hoverEnabled) {
        const { pageid } = d.toElement.__data__[2]
        // const { pageid } = d.path[0].__data__[2];
        const datum = peopleData.find(v => v.pageid === pageid);
        $people
            .selectAll('.person')
            // .selectAll('g.circles circle')
            .classed('is-active', v => v.pageid === pageid)

        $people
            .selectAll('.person')
            .filter(function () {
                return d3.select(this).attr("data-id") == pageid
            })
            // .select('g.circles circle')
            .classed('is-active', true)

        // const $person = d3.select(`[data-id = '${pageid}'`)

        // const x = +d.path[0].__data__[0][0][0] + MARGIN.left;
        // const y = +d.path[0].__data__[0][0][1] + MARGIN.top;
        const x = +d.toElement.__data__[0][0][0] + MARGIN.left;
        const y = +d.toElement.__data__[0][0][1] + MARGIN.top;


        // const x = +$person.select('circle:last-of-type').attr('data-x') + MARGIN.left;
        // const y = +$person.select('circle:last-of-type').attr('data-y') + MARGIN.top;
        const pos = { x: `${x}`, y: `${y}` }
        tooltip.show({ el: $tip, d: datum, pos })
    }
};

function handleVorExit(d) {
    // console.log('exit', d)
};

function createAnnotation({ scaleX, scaleY, annoData, dur = 0, delay = 0 }) {
    $gVis.select('.g-annotation').remove();
    const $anno = $gVis.append('g').attr('class', 'g-annotation')
    $anno.style('opacity', 0)

    const type = d3.annotationCustomType(
        d3.annotationCalloutCircle,
        {
            className: 'custom',
            connector: { type: 'line' },
            note: {
                lineType: 'middle',
                align: 'dynamic'
            },
        }
    )

    const pad = FONT_SIZE * 0.75;

    const annotaions = annoData.map(d => ({
        note: {
            title: d.title,
            padding: d.padding,
            bgPadding: { top: pad, left: pad, right: pad, bottom: pad / 2 },
            wrap: 130
        },
        data: { date: d.value.date, views_adjusted: d.value.views_adjusted },
        dx: d.dx * 2,
        dy: d.dy * 1.5,
        subject: {
            radius: d.r,
            radiusPadding: MIN_R
        }
    }));

    const makeAnnotation = d3.annotation()
        .type(type)
        .notePadding(0)
        .accessors({
            x: d => scaleX(d.date),
            y: d => scaleY(d.views_adjusted)
        })
        .annotations(annotaions);


    // const v = makeAnnotation();
    $anno.call(makeAnnotation);
    $anno
        .transition()
        .duration(dur)
        .delay(delay)
        .ease(EASE)
        .style('opacity', 1)
}

// step render
const STEP = {
    //reverse (direction === 'up') = true, leave = false
    'context': ({ reverse, leave }) => {
        const dur = getDuration({ leave, reverse });

        // DATA
        const data = billieData;

        // SCALES
        const scaleX = getScaleX();
        const scaleY = getScaleY();

        // AXIS
        updateAxis({ scaleX, scaleY, dur, len: 10 });

        // PEOPLE
        const $person = $people.selectAll('.person').data(data, d => d.pageid);
        const $personEnter = $person
            .enter()
            .append('g')
            .attr('class', 'person')
            .call(enterPerson);
        const $personMerge = $personEnter.merge($person);

        $personMerge.call(updatePath, { scaleX, scaleY });
        $personMerge.call(enterCircles, { scaleX, scaleY });

        //highlight billie
        $personMerge.classed('is-highlight', true);
        $personMerge
            .select('circle')
            .transition()
            .duration(dur.fast)
            .ease(EASE)
            .attr('r', MIN_R)
            .style('stroke-width', MIN_R / 2);

        // ANNOTATION
        createAnnotation({ scaleX, scaleY, annoData: [] })

        //EXIT
        //删除没有被绑定的数据，kobe-befor绑定了billie数据还有kebe数据，
        //但是如果从下面状态返回context步骤，那么没有被绑定在$person上面
        //的kobe数据会被删除
        $person
            .exit()
            .transition()
            .duration(dur.fast)
            .style('opacity', 0)
            .remove()
    },
    'grammy': ({ reverse, leave }) => {
        const dur = getDuration({ leave, reverse });

        // DATA
        const data = billieData;
        const annoData = [{
            value: data[0].pageviews[data[0].pageviews.length - 1],
            title: 'Won Grammy Awards',
            padding: FONT_SIZE * 0.5,
            dx: -50,
            dy: 50,
            r: MAX_R * 1.35
        }]

        // SCALES
        const scaleX = getScaleX();
        const scaleY = getScaleY();

        // AXIS
        updateAxis({ scaleX, scaleY, dur, len: 10 });

        // PEOPLE
        const $person = $people.selectAll('.person').data(data, d => d.pageid);
        const $personEnter = $person
            .enter()
            .append('g')
            .attr('class', 'person')
            .call(enterPerson);
        const $personMerge = $personEnter.merge($person);

        $personMerge.call(updatePath, { scaleX, scaleY });
        $personMerge.call(enterCircles, { scaleX, scaleY });

        //highlight billie
        $personMerge.classed('is-highlight', true);
        $personMerge
            .select('circle:last-of-type')
            .transition()
            .duration(dur.fast)
            .ease(EASE)
            .attr('r', MAX_R)
            .style('stroke-width', MIN_R / 2);

        // ANNOTATION
        createAnnotation({ scaleX, scaleY, annoData, dur: dur.fast })

        //EXIT
        //删除没有被绑定的数据，kobe-befor绑定了billie数据还有kebe数据，
        //但是如果从下面状态返回context步骤，那么没有被绑定在$person上面
        //的kobe数据会被删除
        $person
            .exit()
            .transition()
            .duration(dur.fast)
            .style('opacity', 0)
            .remove()
    },
    'kobe-before': ({ reverse, leave }) => {
        if (!reverse && !leave) STEP['context']({ leave: true });

        const dur = getDuration({ leave, reverse });

        // DATA
        const start = findKobeStart(DATE_DEC);
        const data = peopleData.filter(d => d.pageid === KOBE_ID).map(d => ({
            ...d,
            pageviews: trimPageviews(d.pageviews, { start, end: -1 })
        })).concat(billieData);

        // SCALES
        const scaleX = getScaleX();
        const scaleY = getScaleY();

        // AXIS
        updateAxis({ scaleX, scaleY, dur, len: 10 });

        //PEOPLE
        const $person = $people.selectAll('.person').data(data, d => d.pageid);
        const $personEnter = $person
            .enter()
            .append('g')
            .attr('class', 'person')
            .call(enterPerson);

        const $personMerge = $personEnter.merge($person);
        $personMerge.call(enterCircles, { scaleX, scaleY, r: 0 });
        $personMerge.call(updatePath, { scaleX, scaleY, render: !reverse });

        //TRANSITION
        const line = getLine({ scaleX, scaleY });
        if (reverse) {
            $personMerge
                .selectAll('path')
                .transition()
                .duration(dur.slow)
                .ease(EASE)
                .attr('d', line)
                .style('opacity', 1);

            $personMerge
                .selectAll('circle')
                .transition()
                .duration(dur.slow)
                .ease(EASE)
                .style('opacity', 1)
                .attr('transform',
                    d => `translate(${scaleX(d.date)}, ${scaleY(d.views_adjusted)})`);
        } else {
            const $kobe = $personMerge.filter(d => d.pageid === KOBE_ID);
            $kobe.call(resetLine);

            $kobe.selectAll('path')
                .transition()
                .duration(dur.slow)
                .ease(EASE)
                .attr('stroke-dashoffset', 0);

            $kobe.selectAll('circle')
                .transition()
                .duration(dur.medium)
                .delay((d, i, n) => dur.slow + (i / n.length) * dur.fast)
                .ease(EASE)
                .attr('r', d => d.bin_death_index === 0 ? MAX_R : MIN_R)
                .style('stroke-width', d => d.bin_death_index === 0 ? MAX_R /2 : MIN_R/2);
        }

        // ANNOTATION
        createAnnotation({ scaleX, scaleY, annoData: [] })

        //highlight kobe
        $personMerge.classed('is-highlight', d => d.pageid === KOBE_ID);
        $personMerge.filter(d => d.pageid === KOBE_ID).raise();
    },
    'kobe-spike': ({ reverse, leave }) => {
        if (!reverse && !leave) STEP['kobe-before']({ leave: true });

        const dur = getDuration({ leave, reverse });

        // DATA
        const start = findKobeStart(DATE_DEC);
        const data = peopleData.filter(d => d.pageid === KOBE_ID).map(d => ({
            ...d,
            pageviews: trimPageviews(d.pageviews, { start, end: 0 })
        })).concat(billieData);

        // SCALES
        const kobeViews = data.find(d => d.pageid === KOBE_ID).pageviews;
        const scaleX = getScaleX();
        const scaleY = getScaleY(kobeViews);

        // AXIS
        updateAxis({ scaleX, scaleY, dur });

        //PEOPLE(two data set and scale them)
        const $person = $people.selectAll('.person').data(data, d => d.pageid);
        const $personEnter = $person
            .enter()
            .append('g')
            .attr('class', 'person')
            .call(enterPerson);
        const $personMerge = $personEnter.merge($person);

        // TRANSITION
        const addSpike = end => {
            const $kobe = $personMerge
                .filter(d => d.pageid === KOBE_ID)

            const previousLength = $kobe
                .select('path')
                .node()
                .getTotalLength()

            $personMerge.call(updatePath, { scaleX, scaleY });
            $personMerge.call(enterCircles, { scaleX, scaleY, r: 0 });

            if (!leave && !reverse) $kobe.call(resetLine, previousLength);

            $kobe.select('path')
                .transition()
                .duration(dur.slow)
                .ease(EASE)
                .attr('stroke-dashoffset', 0);

            $kobe.selectAll('circle')
                .transition()
                .duration(dur.medium)
                .delay(dur.slow)
                .ease(EASE)
                .attr('r', d => d.bin_death_index === 0 ? MAX_R : MIN_R);
        };

        const line = getLine({ scaleX, scaleY });

        if (reverse) {
            $personMerge.call(enterCircles, { scaleX, scaleY });
            $personMerge.call(updatePath, { scaleX, scaleY, render: !reverse });
            $personMerge
                .selectAll('path')
                .transition()
                .duration(dur.slow)
                .ease(EASE)
                .attr('d', line)
                .style('opacity', 1);

            $personMerge
                .selectAll('circle')
                .transition()
                .duration(dur.slow)
                .ease(EASE)
                .style('opacity', 1)
                .attr('transform',
                    d => `translate(${scaleX(d.date)}, ${scaleY(d.views_adjusted)})`);

        } else {
            $personMerge
                .selectAll('path')
                .transition()
                .duration(dur.slow)
                .ease(EASE)
                .attr('d', line)
                .style('opacity', 1)
                .on('end', d => {
                    if (d[0].pageid === KOBE_ID && !leave) addSpike(true);
                });

            $personMerge
                .selectAll('circle')
                .transition()
                .duration(dur.slow)
                .ease(EASE)
                .style('opacity', 1)
                .attr('transform',
                    d => `translate(${scaleX(d.date)}, ${scaleY(d.views_adjusted)})`);
        }

        $personMerge
            .selectAll('text')
            .transition()
            .duration(dur.fast)
            .ease(EASE)
            .style('opacity', 0)

        //highlight kobe
        $personMerge.classed('is-highlight', d => d.pageid === KOBE_ID);
        $personMerge.filter(d => d.pageid === KOBE_ID).raise();

        // ANNOTATION
        createAnnotation({ scaleX, scaleY, annoData: [] })

        //EXIT
        $person
            .exit()
            .transition()
            .duration(dur.medium)
            .style('opacity', 0)
            .remove()

        // LEAVE
        if (leave && !reverse) addSpike();
    },
    'others': ({ reverse, leave }) => {
        if (!reverse && !leave) STEP['kobe-spike']({ leave: true });

        const dur = getDuration({ leave, reverse });

        // DATA
        const data = peopleData.map(d => ({
            ...d,
            pageviews: trimPageviews(d.pageviews, { start: -50, end: 0 })
        }));

        // SCALES
        data.sort((a, b) => d3.descending(a.death_views_adjusted_2, b.death_views_adjusted_2));

        const scaleX = getScaleX(pageviewData);
        const scaleY = getScaleY(pageviewData);
        const scaleR = getScaleR(data);

        // AXIS
        updateAxis({ scaleX, scaleY, dur, ticks: null });

        //PEOPLE
        data.sort((a, b) =>
            d3.ascending(+a.timestamp_of_death, +b.timestamp_of_death)
        );

        const $person = $people.selectAll('.person').data(data, d => d.pageid);
        const $personEnter = $person
            .enter()
            .append('g')
            .attr('class', 'person')
            .call(enterPerson);

        //PEOPLE
        const addOthers = () => {
            const $personMerge = $personEnter.merge($person);
            $personMerge.call(updatePath, { scaleX, scaleY });
            $personMerge.call(enterCircles, { scaleX, scaleY, r: 0 });

            $personMerge.selectAll('circle')
                .transition()
                .duration(dur.medium)
                .delay((d, i, n) => {
                    const { index } = peopleData.find(p => p.pageid === d.pageid);
                    return dur.slow * (index / peopleData.length);
                })
                .ease(EASE)
                .attr('r', d => scaleR(d.views_adjusted))
                .attr('stroke-width', d => scaleR(d.views_adjusted) / 2);

            $personMerge
                .selectAll('text')
                .attr('transform', d=> {
                    const x = scaleX(d.pageviews[d.pageviews.length-1].date);
                    const y = scaleY(d.pageviews[d.pageviews.length-1].views_adjusted);
                    const r = scaleR(d.pageviews[d.pageviews.length-1].views_adjusted );
                    return `translate(${x},${y- r * 1.5 - FONT_SIZE} )`
                })
                .transition()
                .duration(dur.medium)
                .delay((d, i, n) => {
                    const { index } = peopleData.find(p => p.pageid === d.pageid);
                    return dur.slow * (index / peopleData.length);
                })
                .ease(EASE)
                .style('opacity',  d=> d.perspective_show ? 1: 0)

            $personMerge.filter(d=>d.perspective_show).raise()

            $personMerge
                .selectAll('.is-not-death-index')
                .classed('is-transparent', true);
            $personMerge
                .selectAll('path')
                .classed('is-transparent', true);
        };

        const line = getLine({ scaleX, scaleY });

        $person
            .selectAll('path')
            .transition()
            .duration(dur.slow)
            .ease(EASE)
            .attr('d', line)
            .style('opacity', 0)
            .on('end', addOthers());

        $person
            .selectAll('circle')
            .transition()
            .duration(dur.slow)
            .ease(EASE)
            .style('opacity', d => d.bin_death_index === 0 ? 1 : 0)
            .attr('transform',
                d => `translate(${scaleX(d.date)}, ${scaleY(d.views_adjusted)})`);

        //highlight kobe
        $person.classed('is-highlight', false);

        //EXIT BILLIE
        $person
            .exit()
            .transition()
            .duration(dur.fast)
            .style('opacity', 0)
            .remove()

        // ANNOTATION
        createAnnotation({ scaleX, scaleY, annoData: [] });

        //LEAVE
        if (leave && !reverse) {
            addOthers();
        };
    },
    'compare': ({ reverse, leave }) => {
        if (!reverse && !leave) STEP['others']({ leave: true });

        const dur = getDuration({ leave, reverse });

        // DATA
        const data = peopleData.map(d => ({
            ...d,
            pageviews: trimPageviews(d.pageviews, { start: -50, end: 0 })
        }));

        // UPDATE
        const median = 247415497.0
        const annoData = [
            {
                value: {
                    date: new Date(2020, 10, 10),
                    views_adjusted: 9206544 / 537043880 * median
                },
                title: 'Donald Trump (election loss)',
                padding: 0,
                dx: -Math.floor(width * 0.01),
                dy: -Math.floor(width * 0.05),
                r: MAX_R / 2
            },
            {
                value: {
                    date: new Date(2018, 4, 19),
                    views_adjusted: 4503531 / 530076204 * median
                },
                title: 'Meghan Markel (royal wedding)',
                padding: 0,
                dx: Math.floor(width * 0.01),
                dy: -Math.floor(width * 0.04),
                r: MAX_R / 2
            },
            {
                value: {
                    date: new Date(2022, 1, 24),
                    views_adjusted: 2978160 / 509427173 * median
                },
                title: 'Vladimir Putin (war declaration)',
                padding: 0,
                dx: -Math.floor(width * 0.01),
                dy: -Math.floor(width * 0.04),
                r: MAX_R / 2
            }
        ]

        // SCALES
        data.sort((a, b) => d3.descending(a.death_views_adjusted_2, b.death_views_adjusted_2));

        const scaleX = getScaleX(pageviewData);
        const scaleY = getScaleY(pageviewData);
        const scaleR = getScaleR(data);

        // AXIS
        updateAxis({ scaleX, scaleY, dur, ticks: null });

        //PEOPLE
        data.sort((a, b) =>
            d3.ascending(+a.timestamp_of_death, +b.timestamp_of_death)
        );

        const $person = $people.selectAll('.person').data(data, d => d.pageid);
        const $personEnter = $person
            .enter()
            .append('g')
            .attr('class', 'person')
            .call(enterPerson);

        //PEOPLE
        $person
            .selectAll('path')
            .transition()
            .duration(dur.slow)
            .ease(EASE)
            .style('opacity', 0)


        $person
            .selectAll('circle')
            .transition()
            .duration(dur.slow)
            .ease(EASE)
            .style('opacity', d => d.bin_death_index === 0 ? 1 : 0)
            .attr('transform',
                d => `translate(${scaleX(d.date)}, ${scaleY(d.views_adjusted)})`);

        $person
            .selectAll('text')
            .transition()
            .duration(dur.fast)
            .ease(EASE)
            .style('opacity', 0)

        //highlight kobe
        $person.classed('is-highlight', false);

        //EXIT BILLIE
        $person
            .exit()
            .transition()
            .duration(dur.fast)
            .style('opacity', 0)
            .remove()

        //LEAVE
        if (leave && !reverse) {
            // ANNOTATION
            createAnnotation({ scaleX, scaleY, annoData: [] })
        }else {
            createAnnotation({ scaleX, scaleY, annoData, delay: dur.slow })
        }

        //VORONOI
        const vorDataFull = data
            .map(d => d.pageviews
                .find(v => v.bin_death_index === 0));

        const vorData = vorDataFull.map(p => ([scaleX(p.date), scaleY(p.views_adjusted)]));

        const delaunay = d3.Delaunay.from(vorData);

        const newData = vorDataFull.map(d => ({
            ...d,
            voronoiData: vorDataFull
                .filter(p => p.pageid === d.pageid)
                .map(p => ([scaleX(p.date), scaleY(p.views_adjusted)]))
        }));

        const voronoi = delaunay.voronoi([-MARGIN.left, -MARGIN.top + 20, width + MARGIN.left - 45, height + MARGIN.top - 50]);

        const polygons = newData.map((d, i) => [d.voronoiData, voronoi.cellPolygon(i), d]);


        const $vorPath = $gVor.selectAll('path');

        $vorPath
            .data(polygons)
            .enter()
            .append('path')
            .on('mouseenter', handleVorEnter)
            .on('mouseout', handleVorExit)
            .merge($vorPath)
            .attr("d", d => (d[0, 1] ? `M${d[0, 1].join('L')}Z` : null));
    }
};

function updateDimensions() {
    const h = window.innerHeight;
    height = Math.floor(h * 0.8) - MARGIN.top - MARGIN.bottom;
    width = $chart.node().offsetWidth - MARGIN.left - MARGIN.right;
}

function updateStep({ reverse = true, leave = false }) {
    if (STEP[currentStep]) STEP[currentStep]({ reverse, leave });
    $legend.classed('is-visible', currentStep === 'compare')
}

function resize() {
    updateDimensions();

    $figure
        .style('height', `${innerHeight}px`)
        .style('top', `${HEADER_HEIGHT+20}px`)


    $svg.attr('width', width + MARGIN.left + MARGIN.right)
        .attr('height', height + MARGIN.top + MARGIN.bottom);

    $gVis.attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);
    $gVor.attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);

    // step height and padding
    const stepCount = $step.size();
    $step.style('padding-bottom', innerHeight + 'px');
    $step.filter((d, i) => i === 0).style('margin-top', -innerHeight * 0.67);

    $article.select('.step-hover').style('padding-bottom', `${innerHeight*1.25}px`);

    updateStep({});
};

function handleStepEnter({ index, element, direction }) {
    currentStep = d3.select(element).attr('data-step');
    updateStep({ reverse: direction === 'up' });

}

function handleHoverEnter() {
    hoverEnabled = true;
    $chart.classed('is-hover', true);
    $article.classed('is-disabled', true);
    $filter.classed('is-onscreen', true);
}

function handleHoverExit({ direction }) {
    if (direction === 'up') {
		hoverEnabled = false;
		$chart.classed('is-hover', false);
		$article.classed('is-disabled', false);
		$filter.classed('is-onscreen', false);

		$people.selectAll('.person').classed('is-active', false);
		tooltip.hide($tip);
	}
}

function setupScroller() {
    Stickyfill.add($figure.node());

    scroller.setup({
        // 选择了所有step类，组成一个DOM元素的数组
        step: $step.nodes(),
        offset: 0.95
    }).onStepEnter(handleStepEnter)

    scrollerHover.setup({
        step: '.step-hover',
        offset: 0
    }).onStepEnter(handleHoverEnter)
        .onStepExit(handleHoverExit)
};

function setupTooltip() {
    $tip = tooltip.init({ container: $chart });
    $svg.on('mouseleave', () => {
        tooltip.hide($tip)
    })
};

function loadData(people) {
    return new Promise((resolve, reject) => {
        const filenames = ['perspective', 'Billie_Eilish'];
        // map() 方法返回一个新数组，数组中的元素为原始数组元素调用函数处理后的值
        // f =>f 身份函数 。 它只是返回传入的参数
        const filepaths = filenames.map(f => `assets/data/${f}.csv`);
        d3.csv(filepaths[0]).then(function (response) {
            pageviewData = cleanData.pageviews(response);
            peopleData = people.map(d => ({
                ...d,
                pageviews: pageviewData.filter(p => p.pageid === d.pageid)
            }))
        }).catch(function (error) {
            reject(error);
        });
        d3.csv(filepaths[1]).then(function (response) {
            // filter billie eilish to Dec-Feb
            const billiePageviews = cleanData.pageviews(response);
            billieData = [{
                pageid: 'billie',
                pageviews: billiePageviews.filter(
                    d => d.date >= DATE_DEC && d.date < DATE_FEB)
            }];

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
        setupScroller();
        setupTooltip();
    });
};

export default { init, resize, filter };

