import 'https://cdnjs.cloudflare.com/ajax/libs/d3/7.8.2/d3.min.js';
import truncate from './utils/truncate.js';

const HEADER_HEIGHT = d3.select('header').node().offsetHeight;
const MARGIN = 175;

function getPos({ el, pos}){
    el[1].style('top', pos.y).style('left', pos.x);
    const {top, bottom, left, right} = el[1].node().getBoundingClientRect();

    const topDiff = top - HEADER_HEIGHT;
    const t = topDiff < 0 ? topDiff : 0;

    const className = {
        right: false,
        bottom: false,
    };

    if (bottom < 150) className.bottom = true;

    if (right > window.innerWidth - MARGIN) {
        className.right = true;
    }

    return{ top: +pos.y + +t, className }
}

function hide(el) {
    el[0].classed('is-visible', false)
}

function show({ el, d, pos }) {
    const t = truncate({
        text: d.extract_html,
        chars: 200,
        clean: true,
        ellipses: true
    });

    // content
    el.forEach($el => {
        $el.select('.name').text(d.name)
        $el.select('.date-of-death').text(`${d.date_of_death}, ${d.year_of_death}`)
        // el.tip.select('.year-of-death').text(`Born: ${d.year_of_birth}`)
        $el.select('.bio').html(t);
        $el.select('.cause span').text(d.cause_specific)
        $el.select('.thumbnail').attr('src', d.thumbnail_source).attr('onerror', "this.style.display='none'").attr('style', "display='inline-block'");
    })

    el[1].style('top', `${pos.y}px`).style('left', `${pos.x}px`);

    const {top, className} = getPos({el, pos});
    const left = pos.x

    el[0].style('top', `${pos.y}px`).style('left', `${pos.x}px`)
        .classed('is-visible', true)
        .classed('is-right', className.right)
        .classed('is-bottom', className.bottom)
    
}

function init({ container }) {
    const tip = container.append('div').attr('class', 'tooltip');
    const tipH = container.append('div').attr('class', 'tooltip--hidden');
    const el = [tip, tipH]
    
    el.forEach($el => {
        const $info = $el.append('div').attr('class', 'info');

        const $display = $info.append('p').attr('class', 'display');
        $display.append('span').attr('class', 'name')
        $display.append('span').attr('class', 'date-of-death');

        $info.append('img').attr('class', 'thumbnail');

        $info.append('p').attr('class', 'bio');

        $info.append('p').attr('class', 'cause').html('Cause of death: <span></span>');

        $el.append('div').attr('class', 'stats');
    })

    return [tip, tipH];
}

export default { init, show, hide }