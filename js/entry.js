// D3 is included by globally by default
import 'https://cdn.bootcdn.net/ajax/libs/lodash.js/4.17.21/lodash.js'; // lodash.debounce
import isMobile from './utils/is-mobile.js';
import graphicPerspective from './graphic-perspective.js';
import graphicCare from './graphic-care.js';
import graphicChange from './graphic-change.js';
import graphicImpact from './graphic-impact.js';
import preloadImages from './preload-image.js';
import filter from './filter.js'
import cleanData from './clean-data.js';

const $body = d3.select('body');
let previousWidth = 0;

function resize() {
	// only do resize on width changes, not height
	// (remove the conditional if you want to trigger on height change)
	const width = $body.node().offsetWidth;
	if (previousWidth !== width) {
		previousWidth = width;
		graphicPerspective.resize();
		// graphicChange.resize();
		graphicCare.resize();
		graphicImpact.resize();
	}
}

function setupStickyHeader() {
	const $header = $body.select('header');
	if ($header.classed('is-sticky')) {
		const $menu = $body.select('.header__menu');
		const $toggle = $body.select('.header__toggle');
		$toggle.on('click', () => {
			const visible = $menu.classed('is-visible');
			$menu.classed('is-visible', !visible);
			$toggle.classed('is-visible', !visible);
		});
	}
}

function init() {
	// add mobile class to body tag
	$body.classed('is-mobile', isMobile.any());
	// setup resize event
	window.addEventListener('resize', _.debounce(resize, 150));
	// setup sticky header menu
	setupStickyHeader();

	// kick off graphic code
	d3.csv('assets/data/people.csv').then(function (response) {
		const peopleData = cleanData.people(response);
		graphicPerspective.init(peopleData);
		graphicChange.init(peopleData);
		graphicCare.init(peopleData);
		graphicImpact.init(peopleData);
		filter({name: 'Industry', data:peopleData});
		filter({name:'Cause', data: peopleData});
		// preloadImages(peopleData);
	})
	// .catch(function (error) {
	// 	reject(error);
	// });
}

init();
