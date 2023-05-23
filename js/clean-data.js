import convertTimestampToDate from './convert-timestamp-to-date.js'

function people(data) {
    const clean = data.map((d, i) => ({
        ...d,
        index: i,

        mean_views_adjusted_bd_1:+d.mean_views_adjusted_bd_1,
        mean_views_adjusted_bd_2:+d.mean_views_adjusted_bd_2,
        mean_views_adjusted_bd_3:+d.mean_views_adjusted_bd_3,

        median_views_adjusted_bd_2: +d.median_views_adjusted_bd_2,
        median_views_adjusted_bd_3: +d.median_views_adjusted_bd_3,

        death_views_2: +d.death_views_2,
        death_views_adjusted_2: +d.death_views_adjusted_2,
        death_views_3: +d.death_views_3,
        death_views_adjusted_3: +d.death_views_adjusted_3,


        thumbnail_width: +d.thumbnail_width,
        thumbnail_height: +d.thumbnail_height,
        year_of_birth: +d.year_of_birth,
        year_of_death: +d.year_of_death,

        iqr: +d.iqr_1,
        std: +d.std_1,

        industry: d.industry.split(',').map(v=>v.trim()),
        cause: [d.cause.trim()],
        perspective_show: !!d.perspective_show
    }));
    const missing = clean.filter(d=>!d.industry);
    if (missing.length) console.log({missing})
    return clean
}

function pageviews(data) {
    return data.map(d => ({
        ...d,
        pageid: d.pageid || 'billie',
        bin: +d.bin,
        bin_death_index: +d.bin_death_index,
        views: +d.views,
        views_adjusted: +d.views_adjusted,
        date: convertTimestampToDate(d.timestamp)
    }));
}

function ma(data) {
    return data.map(d => ({
        ...d,
        pageid: d.pageid,
        bin_death_index: +d.bin_death_index,
        ma: +d.ma,
        diff: +d.diff,
        diff_percent: +d.diff_percent,
        diff_views: +d.diff_views,
        diff_percent_views: +d.diff_percent_views
    }));
}

export default{ people, pageviews, ma}