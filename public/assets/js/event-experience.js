(function (global) {
	'use strict';

	function escapeHtml(value) {
		return String(value == null ? '' : value)
			.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;').replace(/'/g, '&#039;');
	}

	function safeHttpUrl(value) {
		try {
			var parsed = new URL(String(value || ''), global.location.origin);
			return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.href : '#';
		} catch (_error) { return '#'; }
	}

	function formatDate(value, compact) {
		if (!value) return 'Date unavailable';
		var parsed = new Date(String(value).length === 10 ? value + 'T12:00:00Z' : value);
		if (isNaN(parsed.getTime())) return String(value);
		return parsed.toLocaleDateString('en-US', compact
			? { month: 'short', day: 'numeric', year: 'numeric' }
			: { month: 'long', day: 'numeric', year: 'numeric' });
	}

	function sourceLabelForUrl(value, fallback) {
		var host = '';
		try { host = new URL(String(value || '')).hostname.toLowerCase().replace(/^www\./, ''); } catch (_error) { return fallback || 'Original source'; }
		var known = [
			['abcnews', 'ABC News'], ['bbc.', 'BBC'], ['bbc.co', 'BBC'], ['cbsnews', 'CBS News'],
			['nbcnews', 'NBC News'], ['theguardian', 'The Guardian'], ['reuters', 'Reuters'],
			['apnews', 'AP News'], ['politico', 'Politico'], ['nytimes', 'The New York Times'],
			['washingtonpost', 'The Washington Post'], ['aljazeera', 'Al Jazeera'], ['npr.org', 'NPR']
		];
		var match = known.find(function (item) { return host.indexOf(item[0]) !== -1; });
		if (match) return match[1];
		return fallback || host.split('.')[0].replace(/[-_]/g, ' ').replace(/\b\w/g, function (letter) { return letter.toUpperCase(); });
	}

	function normalizeBias(value) {
		var bias = String(value || '').trim().toLowerCase().replace(/_/g, '-');
		var ratings = {
			'left': { label: 'Left', className: 'bias-left' },
			'lean-left': { label: 'Left', detail: 'Lean Left', className: 'bias-lean-left' },
			'left-center': { label: 'Left', detail: 'Lean Left', className: 'bias-lean-left' },
			'center-left': { label: 'Left', detail: 'Lean Left', className: 'bias-lean-left' },
			'center': { label: 'Center', className: 'bias-center' },
			'centre': { label: 'Center', className: 'bias-center' },
			'lean-right': { label: 'Right', detail: 'Lean Right', className: 'bias-lean-right' },
			'right-center': { label: 'Right', detail: 'Lean Right', className: 'bias-lean-right' },
			'center-right': { label: 'Right', detail: 'Lean Right', className: 'bias-lean-right' },
			'right': { label: 'Right', className: 'bias-right' },
			'mixed': { label: 'Mixed', className: 'bias-mixed' },
			'unrated': { label: 'Unrated', className: 'bias-unrated' },
			'unknown': { label: 'Unrated', className: 'bias-unrated' }
		};
		return ratings[bias] || null;
	}

	function normalizeAccess(item) {
		var raw = item && (item.access_type || item.access || item.access_model || item.subscription_type);
		if (!raw && item && item.paywall === true) raw = 'paywall';
		var value = String(raw || '').trim().toLowerCase().replace(/_/g, ' ');
		var labels = { 'free': 'Free', 'open': 'Free', 'registration': 'Registration', 'registration required': 'Registration', 'paywall': 'Paywall', 'paid': 'Paywall', 'subscription': 'Subscription' };
		return labels[value] || '';
	}

	function renderSourceBadges(item) {
		var badges = [];
		var bias = normalizeBias(item && item.source_bias);
		var access = normalizeAccess(item || {});
		if (bias) badges.push('<span class="source-trust-badge ' + bias.className + '" title="' + escapeHtml((bias.detail || bias.label) + ' — outlet-level orientation, not an article score') + '">' + escapeHtml(bias.label) + '</span>');
		if (access) badges.push('<span class="source-trust-badge access">' + escapeHtml(access) + '</span>');
		return badges.length ? '<div class="source-trust-badges">' + badges.join('') + '</div>' : '';
	}

	function entrySourceDetails(entry) {
		var details = Array.isArray(entry && entry.source_details) ? entry.source_details.filter(Boolean) : [];
		if (details.length) return details;
		var urls = Array.isArray(entry && entry.source_urls) ? entry.source_urls : [];
		var names = Array.isArray(entry && entry.sources) ? entry.sources : [];
		return urls.map(function (url, index) {
			return { link: url, source: sourceLabelForUrl(url, names[index] || names[0]) };
		});
	}

	function storyAsEntry(story) {
		return {
			development_id: story.story_id || story.cluster_id || 'current-story',
			daily_story_id: story.story_id || story.cluster_id || 'current-story',
			date: story.date || story.run_date || story.published_date || new Date().toISOString().slice(0, 10),
			title: story.title || 'Current update', summary: story.summary || '',
			key_facts: story.key_facts || [], development_type: story.development_type || 'development',
			source_count: story.source_count || (story.items || []).length,
			source_details: (story.items || []).map(function (item) {
				return { title: item.title, source: item.source, link: item.link, source_bias: item.source_bias, access_type: item.access_type || item.access, paywall: item.paywall };
			})
		};
	}

	function normalizeTimeline(event, story) {
		var context = story && story.story_context || {};
		var timeline = Array.isArray(event && event.timeline) && event.timeline.length
			? event.timeline.slice()
			: (Array.isArray(context.highlights) ? context.highlights.slice() : (Array.isArray(story && story.timeline_highlights) ? story.timeline_highlights.slice() : []));
		if (story) {
			var currentId = story.story_id || story.cluster_id;
			var hasCurrent = timeline.some(function (entry) { return entry.development_id === currentId || entry.daily_story_id === currentId; });
			if (!hasCurrent) timeline.push(storyAsEntry(story));
		}
		return timeline.filter(function (entry) { return entry && (entry.title || entry.summary); }).sort(function (left, right) {
			return String(left.date || '').localeCompare(String(right.date || '')) || String(left.development_id || '').localeCompare(String(right.development_id || ''));
		});
	}

	function selectedMilestoneIndexes(timeline, currentIndex) {
		if (timeline.length <= 6) return timeline.map(function (_entry, index) { return index; });
		var indexes = [0, Math.round((timeline.length - 1) / 3), Math.round((timeline.length - 1) * 2 / 3), timeline.length - 1];
		if (currentIndex >= 0) indexes.push(currentIndex);
		return indexes.filter(function (index, position, values) { return values.indexOf(index) === position; }).sort(function (a, b) { return a - b; });
	}

	function displayTitle(event, story, stage) {
		var presentation = event && event.presentation || {};
		var context = story && story.story_context || {};
		var base = presentation.base_title || event && (event.topic_label || event.canonical_title || event.title) || context.event_title || story && (story.event_title || story.topic_label) || 'Developing story';
		var explicit = presentation.display_title || event && event.display_title;
		if (explicit) return explicit;
		if (stage === 'timeline' && !/\btimeline\b/i.test(base)) return base + ' Timeline';
		return base;
	}

	function sourceLinks(details, limit) {
		var seen = {};
		return details.filter(function (item) {
			var url = safeHttpUrl(item && (item.link || item.url));
			if (url === '#' || seen[url]) return false;
			seen[url] = true;
			return true;
		}).slice(0, limit || 8).map(function (item) {
			var url = safeHttpUrl(item.link || item.url);
			var label = item.source || item.name || sourceLabelForUrl(url);
			return '<a class="event-evidence-link" href="' + escapeHtml(url) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(label) + '</a>';
		}).join('');
	}

	function developmentDetail(entry, isCurrent) {
		if (!entry) return '';
		var type = String(entry.development_type || 'development').replace(/_/g, ' ');
		var facts = Array.isArray(entry.key_facts) ? entry.key_facts.filter(Boolean).slice(0, 5) : [];
		var details = entrySourceDetails(entry);
		var isBackfilled = Boolean(entry.backfilled || entry.origin === 'search_backfill');
		var backfillLabel = entry.backfill_label || ({
			origin: 'Background before Muninn began tracking',
			bridge: 'Backfilled from sourced reporting',
			latest: 'Latest update found through sourced search'
		}[entry.timeline_role] || 'Sourced timeline backfill');
		var html = '<div class="event-development-meta"><span>' + escapeHtml(formatDate(entry.date)) + '</span>';
		if (type !== 'development') html += '<span>' + escapeHtml(type) + '</span>';
		if (isCurrent) html += '<span>Current update</span>';
		if (isBackfilled) html += '<span class="event-backfill-label">' + escapeHtml(backfillLabel) + '</span>';
		html += '</div><h3>' + escapeHtml(entry.title || 'Update') + '</h3>';
		if (entry.summary) html += '<p>' + escapeHtml(entry.summary) + '</p>';
		if (facts.length) html += '<ul class="event-key-facts">' + facts.map(function (fact) { return '<li>' + escapeHtml(fact) + '</li>'; }).join('') + '</ul>';
		if (details.length) html += '<div class="event-evidence"><div class="event-evidence-label">Sources for this development</div><div class="event-evidence-links">' + sourceLinks(details, 8) + '</div></div>';
		return html;
	}

	function summaryPayload(event, story, timeline, milestoneIndexes) {
		var context = story && story.story_context || {};
		var presentation = event && event.presentation || {};
		var supplied = event && event.event_summary || context.event_summary || {};
		if (typeof supplied === 'string') supplied = { summary: supplied };
		var text = supplied.summary || supplied.text || presentation.context_summary || context.summary || '';
		var suppliedPoints = supplied.key_developments || supplied.turning_points || [];
		var points = suppliedPoints.length ? suppliedPoints : milestoneIndexes.map(function (index) { return timeline[index]; });
		var allSources = [];
		timeline.forEach(function (entry) { allSources = allSources.concat(entrySourceDetails(entry)); });
		if (Array.isArray(supplied.sources)) allSources = supplied.sources.concat(allSources);
		return { text: text, points: points.slice(0, 6), sources: allSources, updatedAt: supplied.updated_at || presentation.summary_updated_at || presentation.latest_date || (timeline[timeline.length - 1] || {}).date };
	}

	function renderSummaryPanel(summary) {
		var html = '<div class="event-summary-panel" data-event-summary-panel hidden><h3>The story so far</h3>';
		if (summary.text) html += '<p>' + escapeHtml(summary.text) + '</p>';
		if (summary.points.length) {
			html += '<ul class="event-summary-points">' + summary.points.map(function (point) {
				var title = typeof point === 'string' ? point : point.title;
				var date = typeof point === 'string' ? '' : point.date;
				return '<li>' + (date ? '<strong>' + escapeHtml(formatDate(date, true)) + ':</strong> ' : '') + escapeHtml(title || 'Development') + '</li>';
			}).join('') + '</ul>';
		}
		var links = sourceLinks(summary.sources, 10);
		if (links) html += '<div class="event-evidence"><div class="event-evidence-label">Sources across this event</div><div class="event-evidence-links">' + links + '</div></div>';
		if (summary.updatedAt) html += '<div class="event-summary-updated">Event summary updated ' + escapeHtml(formatDate(summary.updatedAt)) + '</div>';
		return html + '</div>';
	}

	function renderEventOverview(event, context) {
		var overview = event && event.event_overview || context && context.event_overview || {};
		if (!overview.available || !overview.summary) return '';
		var sources = Array.isArray(overview.sources) ? overview.sources : [];
		var sourceById = {};
		sources.forEach(function (source) { if (source && source.id) sourceById[source.id] = source; });
		var facts = Array.isArray(overview.facts) ? overview.facts.slice(0, 5) : [];
		var html = '<aside class="event-overview"><div class="event-overview-kicker">About this event</div>';
		html += '<h3>' + escapeHtml(overview.title || ('About ' + (overview.subject || 'this event'))) + '</h3>';
		html += '<p>' + escapeHtml(overview.summary) + '</p>';
		if (facts.length) {
			html += '<details class="event-overview-details"><summary>Event facts and sources</summary><dl class="event-overview-facts">';
			facts.forEach(function (fact) {
				var factSources = (fact.source_ids || []).map(function (id) { return sourceById[id]; }).filter(Boolean);
				html += '<div><dt>' + escapeHtml(fact.label || 'Fact') + '</dt><dd>' + escapeHtml(fact.value || '');
				if (factSources.length) html += '<span class="event-overview-citations">' + factSources.map(function (source) { return '<a aria-label="Open event overview source" href="' + escapeHtml(safeHttpUrl(source.url || source.link)) + '" target="_blank" rel="noopener noreferrer">[' + escapeHtml(String(source.id).replace(/^o/i, '')) + ']</a>'; }).join('') + '</span>';
				html += '</dd></div>';
			});
			html += '</dl>';
			if (overview.scope_note) html += '<p class="event-overview-scope">' + escapeHtml(overview.scope_note) + '</p>';
			if (sources.length) html += '<div class="event-evidence"><div class="event-evidence-label">Background sources</div><div class="event-evidence-links">' + sourceLinks(sources.map(function (source) { return {link: source.url, source: source.publisher}; }), 8) + '</div></div>';
			html += '</details>';
		}
		return html + '</aside>';
	}

	function renderRelated(event, context) {
		var related = Array.isArray(event && event.related_events) && event.related_events.length ? event.related_events : context.related_events;
		if (!Array.isArray(related) || !related.length) return '';
		return '<div class="event-related"><strong>Related events</strong><div class="event-related-links">' + related.slice(0, 4).map(function (item) {
			return '<a class="event-related-link" href="/timeline.html?event=' + encodeURIComponent(item.event_id || '') + '">' + escapeHtml(item.title || 'Related event') + '</a>';
		}).join('') + '</div></div>';
	}

	function mount(target, options) {
		var container = typeof target === 'string' ? document.querySelector(target) : target;
		if (!container) return false;
		options = options || {};
		var event = options.event || {};
		var story = options.story || null;
		var context = story && story.story_context || {};
		var presentation = event.presentation || {};
		var timeline = normalizeTimeline(event, story);
		if (timeline.length < 2 && !context.available && !presentation.has_context) { container.innerHTML = ''; return false; }
		var currentId = story && (story.story_id || story.cluster_id) || '';
		var currentIndex = timeline.findIndex(function (entry) { return entry.development_id === currentId || entry.daily_story_id === currentId; });
		if (currentIndex < 0) currentIndex = timeline.length - 1;
		var hasFullTimeline = Boolean(presentation.has_full_timeline || context.full_timeline_available);
		var stage = presentation.stage || event.event_stage || (hasFullTimeline ? 'timeline' : 'developing_event');
		var milestones = selectedMilestoneIndexes(timeline, currentIndex);
		var milestoneLookup = {};
		milestones.forEach(function (index) { milestoneLookup[index] = true; });
		var title = displayTitle(event, story, stage);
		var description = presentation.context_summary || context.summary || event.summary || '';
		var dateCount = presentation.date_count || context.date_count || new Set(timeline.map(function (entry) { return entry.date; }).filter(Boolean)).size;
		var sourceCount = presentation.independent_source_count || presentation.source_count || 0;
		var railHtml = '';
		timeline.forEach(function (entry, index) {
			if (index > 0 && milestoneLookup[index] && !milestoneLookup[index - 1]) {
				var previousMilestone = milestones[milestones.indexOf(index) - 1];
				var hiddenCount = Math.max(1, index - previousMilestone - 1);
				railHtml += '<div class="event-rail-item event-rail-gap"><button class="event-gap-button" type="button" data-expand-rail aria-label="Show ' + hiddenCount + ' hidden developments">//</button></div>';
			}
			var classes = 'event-rail-item' + (milestoneLookup[index] ? '' : ' is-collapsed-node');
			var isCurrent = index === currentIndex;
			var isBackfilled = Boolean(entry.backfilled || entry.origin === 'search_backfill');
			railHtml += '<div class="' + classes + '"><button class="event-node-button' + (isCurrent ? ' is-current' : '') + '" type="button" role="tab" aria-selected="' + (isCurrent ? 'true' : 'false') + '" data-development-index="' + index + '">';
			railHtml += '<span class="event-node-date">' + escapeHtml(formatDate(entry.date, true)) + '</span><span class="event-node-name">' + escapeHtml(entry.title || 'Update') + '</span>';
			if (isBackfilled) railHtml += '<span class="event-node-backfill">Sourced backfill</span>';
			if (isCurrent) railHtml += '<span class="event-node-current">Current</span>';
			railHtml += '</button></div>';
		});

		var summary = summaryPayload(event, story, timeline, milestones);
		var stageLabel = presentation.stage_label || (stage === 'timeline' ? 'Timeline' : 'Developing event');
		var headingTag = options.mode === 'page' ? 'h1' : 'h2';
		var html = '<section class="event-experience" aria-label="Event context"><div class="event-experience-header">';
		html += '<div class="event-experience-kicker">' + escapeHtml(options.mode === 'page' ? stageLabel : 'Part of a ' + stageLabel.toLowerCase()) + '</div>';
		html += '<' + headingTag + ' class="event-experience-title">' + escapeHtml(title) + '</' + headingTag + '>';
		if (description) html += '<p class="event-experience-summary">' + escapeHtml(description) + '</p>';
		html += '<div class="event-experience-stats"><span class="event-stat">' + timeline.length + ' developments</span>';
		if (dateCount) html += '<span class="event-stat">' + escapeHtml(dateCount) + ' dates</span>';
		if (sourceCount) html += '<span class="event-stat">' + escapeHtml(sourceCount) + ' publisher' + (sourceCount === 1 ? '' : 's') + '</span>';
		html += '</div></div>' + renderEventOverview(event, context) + '<div class="event-rail-region"><div class="event-rail-label"><strong>Follow the developments</strong><span class="event-rail-hint">Select a point to read it · // expands hidden updates</span></div>';
		html += '<div class="event-rail-scroll"><div class="event-rail" role="tablist" aria-label="Event developments">' + railHtml + '</div></div>';
		html += '<article class="event-development" data-event-development tabindex="-1">' + developmentDetail(timeline[currentIndex], true) + '</article></div>';
		html += '<div class="event-experience-actions"><button class="event-action" type="button" data-summary-toggle aria-expanded="false">Read the story so far</button>';
		if (event.event_id && options.mode !== 'page') html += '<a class="event-action secondary" href="/timeline.html?event=' + encodeURIComponent(event.event_id) + '">' + (hasFullTimeline ? 'Open full timeline' : 'Open event page') + '</a>';
		html += '</div>' + renderSummaryPanel(summary) + renderRelated(event, context) + '</section>';
		container.innerHTML = html;

		var rail = container.querySelector('.event-rail');
		var detail = container.querySelector('[data-event-development]');
		function selectDevelopment(index, focusDetail) {
			container.querySelectorAll('[data-development-index]').forEach(function (button) { button.setAttribute('aria-selected', String(Number(button.getAttribute('data-development-index')) === index)); });
			detail.innerHTML = developmentDetail(timeline[index], index === currentIndex);
			if (focusDetail) detail.focus({ preventScroll: true });
		}
		container.querySelectorAll('[data-development-index]').forEach(function (button) {
			button.addEventListener('click', function () { selectDevelopment(Number(button.getAttribute('data-development-index')), false); });
			button.addEventListener('keydown', function (eventKey) {
				if (eventKey.key !== 'ArrowLeft' && eventKey.key !== 'ArrowRight') return;
				var visible = Array.prototype.slice.call(container.querySelectorAll(rail.classList.contains('is-expanded') ? '[data-development-index]' : '.event-rail-item:not(.is-collapsed-node) [data-development-index]'));
				var position = visible.indexOf(button);
				var next = eventKey.key === 'ArrowRight' ? visible[position + 1] : visible[position - 1];
				if (next) { eventKey.preventDefault(); next.focus(); next.click(); }
			});
		});
		container.querySelectorAll('[data-expand-rail]').forEach(function (button) {
			button.addEventListener('click', function () {
				rail.classList.add('is-expanded');
				var firstHidden = rail.querySelector('.is-collapsed-node [data-development-index]');
				if (firstHidden) firstHidden.focus();
			});
		});
		var summaryButton = container.querySelector('[data-summary-toggle]');
		var summaryPanel = container.querySelector('[data-event-summary-panel]');
		if (summaryButton && summaryPanel) {
			summaryButton.addEventListener('click', function () {
				var open = summaryButton.getAttribute('aria-expanded') === 'true';
				summaryButton.setAttribute('aria-expanded', String(!open));
				summaryButton.textContent = open ? 'Read the story so far' : 'Hide event summary';
				summaryPanel.hidden = open;
			});
		}
		return true;
	}

	global.MuninnEventExperience = {
		escapeHtml: escapeHtml, formatDate: formatDate, mount: mount,
		renderSourceBadges: renderSourceBadges, safeHttpUrl: safeHttpUrl,
		sourceLabelForUrl: sourceLabelForUrl
	};
})(window);
