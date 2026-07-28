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
			'lean-left': { label: 'Lean left', className: 'bias-lean-left' },
			'left-center': { label: 'Lean left', className: 'bias-lean-left' },
			'center-left': { label: 'Lean left', className: 'bias-lean-left' },
			'center': { label: 'Center', className: 'bias-center' },
			'centre': { label: 'Center', className: 'bias-center' },
			'lean-right': { label: 'Lean right', className: 'bias-lean-right' },
			'right-center': { label: 'Lean right', className: 'bias-lean-right' },
			'center-right': { label: 'Lean right', className: 'bias-lean-right' },
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
		return base;
	}

	function eventImage(event) {
		var presentation = event && event.presentation || {};
		var image = event && (event.hero_image || event.image) || presentation.hero_image || presentation.image || {};
		var url = safeHttpUrl(image.url || image.thumbnail_url);
		if (url === '#') return null;
		return {
			url: url,
			alt: image.alt || image.title || event.canonical_title || event.title || 'Event illustration',
			label: image.image_role_label || (image.image_role === 'illustrative' || image.is_ai_generated ? 'AI illustration' : ''),
			focalX: Number.isFinite(Number(image.focal_wide_x)) ? Number(image.focal_wide_x) : Number(image.focal_x || 0.5),
			focalY: Number.isFinite(Number(image.focal_wide_y)) ? Number(image.focal_wide_y) : Number(image.focal_y || 0.5)
		};
	}

	function renderEventLead(event, context, timeline, currentIndex, leadLabel, summaryOverride) {
		var overview = event && event.event_overview || context && context.event_overview || {};
		var suppliedSummary = event && event.event_summary || context && context.event_summary || {};
		if (typeof suppliedSummary === 'string') suppliedSummary = { summary: suppliedSummary };
		var latest = timeline[currentIndex] || timeline[timeline.length - 1] || {};
		var summary = summaryOverride || overview.summary || suppliedSummary.summary || event.summary || context.summary || '';
		var image = eventImage(event);
		var html = '<div class="event-lead-card' + (image ? '' : ' event-lead-card-no-image') + '"><div class="event-lead-copy">';
		html += '<h2 class="event-lead-label">' + escapeHtml(leadLabel || 'Story so far') + '</h2>';
		if (summary) html += '<p class="event-lead-summary">' + escapeHtml(summary) + '</p>';
		if (latest.title || latest.summary) {
			html += '<div class="event-latest-update"><div class="event-latest-label">Latest update' + (latest.date ? ' · ' + escapeHtml(formatDate(latest.date, true)) : '') + '</div>';
			if (latest.title) html += '<a href="#event-history">' + escapeHtml(latest.title) + ' <span aria-hidden="true">↓</span></a>';
			html += '</div>';
		}
		if (overview.available && Array.isArray(overview.facts) && overview.facts.length) {
			var sources = Array.isArray(overview.sources) ? overview.sources : [];
			var sourceById = {};
			sources.forEach(function (source) { if (source && source.id) sourceById[source.id] = source; });
			html += '<details class="event-overview-details"><summary>Key facts and background sources</summary><dl class="event-overview-facts">';
			overview.facts.slice(0, 5).forEach(function (fact) {
				var factSources = (fact.source_ids || []).map(function (id) { return sourceById[id]; }).filter(Boolean);
				html += '<div><dt>' + escapeHtml(fact.label || 'Fact') + '</dt><dd>' + escapeHtml(fact.value || '');
				if (factSources.length) html += '<span class="event-overview-citations">' + factSources.map(function (source) { return '<a aria-label="Open background source" href="' + escapeHtml(safeHttpUrl(source.url || source.link)) + '" target="_blank" rel="noopener noreferrer">[' + escapeHtml(String(source.id).replace(/^o/i, '')) + ']</a>'; }).join('') + '</span>';
				html += '</dd></div>';
			});
			html += '</dl>';
			if (overview.scope_note) html += '<p class="event-overview-scope">' + escapeHtml(overview.scope_note) + '</p>';
			if (sources.length) html += '<div class="event-evidence"><div class="event-evidence-label">Background sources</div><div class="event-evidence-links">' + sourceLinks(sources.map(function (source) { return { link: source.url, source: source.publisher }; }), 8) + '</div></div>';
			html += '</details>';
		}
		html += '</div>';
		if (image) {
			html += '<figure class="event-lead-image"><img src="' + escapeHtml(image.url) + '" alt="' + escapeHtml(image.alt) + '" style="object-position:' + (image.focalX * 100) + '% ' + (image.focalY * 100) + '%">';
			if (image.label) html += '<figcaption>' + escapeHtml(image.label) + '</figcaption>';
			html += '</figure>';
		}
		return html + '</div>';
	}

	function summaryText(value) {
		if (typeof value === 'string') return value;
		return value && (value.summary || value.text) || '';
	}

	function coverageMembers(coverage, allEvents, parentEvent) {
		var eventById = {};
		(Array.isArray(allEvents) ? allEvents : []).forEach(function (item) {
			if (item && item.event_id) eventById[item.event_id] = item;
		});
		return (Array.isArray(coverage && coverage.child_events) ? coverage.child_events : []).map(function (member) {
			var linkedEvent = eventById[member.event_id] || {};
			var presentation = linkedEvent.presentation || {};
			var timeline = Array.isArray(linkedEvent.timeline) ? linkedEvent.timeline : [];
			var latest = timeline[timeline.length - 1] || {};
			var hasPage = Boolean(member.event_id && linkedEvent.event_id);
			var image = eventImage(linkedEvent) || (!hasPage ? eventImage(parentEvent) : null);
			return {
				eventId: member.event_id || '',
				title: member.title || presentation.base_title || linkedEvent.topic_label || linkedEvent.canonical_title || linkedEvent.title || 'Tracked event',
				summary: member.summary || summaryText(linkedEvent.event_overview) || summaryText(linkedEvent.event_summary) || linkedEvent.summary || '',
				kind: member.kind || (hasPage ? 'Event' : 'Coverage thread'),
				state: String(member.state || 'active').toLowerCase().replace(/[\s-]+/g, '_'),
				stateLabel: member.state_label || '',
				latestTitle: member.latest_title || latest.title || '',
				developmentCount: member.development_count || presentation.development_count || timeline.length,
				latestDate: member.latest_date || presentation.latest_date || latest.date || '',
				hasPage: hasPage,
				image: image
			};
		}).sort(function (left, right) {
			return String(right.latestDate || '').localeCompare(String(left.latestDate || ''))
				|| String(left.title || '').localeCompare(String(right.title || ''));
		});
	}

	function shortSummary(value, limit) {
		var text = String(value || '').replace(/\s+/g, ' ').trim();
		var maxLength = Number(limit || 220);
		if (text.length <= maxLength) return text;
		var cut = text.slice(0, maxLength + 1);
		var sentenceEnd = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('? '), cut.lastIndexOf('! '));
		if (sentenceEnd >= Math.floor(maxLength * 0.55)) return cut.slice(0, sentenceEnd + 1);
		var wordEnd = cut.lastIndexOf(' ');
		return cut.slice(0, wordEnd > 0 ? wordEnd : maxLength).trim() + '...';
	}

	function renderCoverageLead(coverage, event, timeline) {
		var latest = timeline[timeline.length - 1] || {};
		var currentStatus = coverage.current_status || latest.summary || '';
		var verifiedThrough = coverage.verified_through || latest.date || '';
		var image = eventImage(event);
		if (!currentStatus) return '';
		var html = '<section class="coverage-current-status' + (image ? ' has-image' : ' no-image') + '" aria-labelledby="coverage-current-heading"><div class="coverage-current-heading"><span class="coverage-section-eyebrow">Current brief</span><h2 id="coverage-current-heading">Where things stand</h2>';
		if (verifiedThrough) html += '<span>Verified ' + escapeHtml(formatDate(verifiedThrough, true)) + '</span>';
		html += '</div><p>' + escapeHtml(currentStatus) + '</p>';
		if (image) {
			html += '<figure class="coverage-current-image"><img src="' + escapeHtml(image.url) + '" alt="' + escapeHtml(image.alt) + '" style="object-position:' + (image.focalX * 100) + '% ' + (image.focalY * 100) + '%">';
			if (image.label) html += '<figcaption>' + escapeHtml(image.label) + '</figcaption>';
			html += '</figure>';
		}
		html += '</section>';
		return html;
	}

	function renderCoverageMemberCard(member) {
		var tag = member.hasPage ? 'a' : 'article';
		var href = member.hasPage ? ' href="/timeline.html?event=' + encodeURIComponent(member.eventId) + '"' : '';
		var html = '<' + tag + ' class="coverage-member coverage-member-card' + (member.image ? ' has-image' : ' no-image') + '"' + href + '>';
		if (member.image) {
			html += '<figure class="coverage-member-image"><img src="' + escapeHtml(member.image.url) + '" alt="' + escapeHtml(member.image.alt) + '" loading="lazy" style="object-position:' + (member.image.focalX * 100) + '% ' + (member.image.focalY * 100) + '%">';
			if (member.image.label) html += '<figcaption>' + escapeHtml(member.image.label) + '</figcaption>';
			html += '</figure>';
		}
		html += '<div class="coverage-member-main"><div class="coverage-member-top"><span class="coverage-member-kind">' + escapeHtml(member.stateLabel || member.kind) + '</span>';
		if (member.latestDate) html += '<time datetime="' + escapeHtml(member.latestDate) + '">Updated ' + escapeHtml(formatDate(member.latestDate, true)) + '</time>';
		html += '</div><h3>' + escapeHtml(member.title) + '</h3>';
		if (member.latestTitle) html += '<p><span>Latest:</span> ' + escapeHtml(shortSummary(member.latestTitle, 130)) + '</p>';
		else if (member.summary) html += '<p>' + escapeHtml(shortSummary(member.summary, 130)) + '</p>';
		html += '</div><div class="coverage-member-meta">';
		if (member.developmentCount) html += '<span>' + escapeHtml(member.developmentCount) + ' development' + (Number(member.developmentCount) === 1 ? '' : 's') + '</span>';
		html += '<span>' + (member.hasPage ? 'Open →' : 'Tracking') + '</span></div>';
		return html + '</' + tag + '>';
	}

	function renderCoverageMembers(coverage, allEvents, parentEvent) {
		var members = coverageMembers(coverage, allEvents, parentEvent);
		if (!members.length) return '';
		var pastStates = { archived: true, closed: true, earlier_phase: true, past: true, past_phase: true };
		var activeMembers = members.filter(function (member) { return !pastStates[member.state]; });
		var pastMembers = members.filter(function (member) { return pastStates[member.state]; });
		var eventCount = activeMembers.filter(function (member) { return member.hasPage; }).length;
		var threadCount = activeMembers.length - eventCount;
		var html = '<section class="coverage-members" aria-labelledby="coverage-members-heading"><div class="coverage-section-heading"><span class="coverage-section-eyebrow">Coverage map</span><h2 id="coverage-members-heading">What we\'re tracking</h2><p>';
		if (eventCount) html += eventCount + ' linked event' + (eventCount === 1 ? '' : 's');
		if (eventCount && threadCount) html += ' · ';
		if (threadCount) html += threadCount + ' coverage thread' + (threadCount === 1 ? '' : 's');
		if (!activeMembers.length) html += 'No active threads';
		html += '</p></div>';
		if (activeMembers.length) html += '<div class="coverage-members-grid">' + activeMembers.map(renderCoverageMemberCard).join('') + '</div>';
		if (pastMembers.length) {
			html += '<details class="coverage-past-phases"><summary><span><span class="coverage-section-eyebrow">Archive</span><strong>Earlier phases</strong></span><span>' + pastMembers.length + '</span></summary>';
			html += '<p>Paused or completed phases stay attached to the larger story so renewed developments keep their context.</p>';
			html += '<div class="coverage-members-grid is-past">' + pastMembers.map(renderCoverageMemberCard).join('') + '</div></details>';
		}
		return html + '</section>';
	}

	function renderCoverageUpdates(coverage, timeline) {
		if (!timeline.length) return '';
		var labels = coverage.update_event_labels || {};
		var latestEntries = timeline.slice(-6).reverse();
		function updateHtml(entry) {
			var label = labels[entry.development_id] || labels[entry.daily_story_id] || String(entry.development_type || 'Coverage update').replace(/_/g, ' ');
			var sourceCount = entry.source_count || entrySourceDetails(entry).length;
			var row = '<article class="coverage-update"><div class="coverage-update-meta"><span>' + escapeHtml(label) + '</span>';
			if (entry.date) row += '<time datetime="' + escapeHtml(entry.date) + '">' + escapeHtml(formatDate(entry.date, true)) + '</time>';
			if (sourceCount) row += '<span>' + escapeHtml(sourceCount) + ' source' + (Number(sourceCount) === 1 ? '' : 's') + '</span>';
			row += '</div><h3>' + escapeHtml(entry.title || 'Update') + '</h3>';
			if (entry.summary) row += '<p>' + escapeHtml(shortSummary(entry.summary, 210)) + '</p>';
			return row + '</article>';
		}
		var visible = latestEntries.slice(0, 3);
		var older = latestEntries.slice(3);
		var html = '<section class="coverage-updates" aria-labelledby="coverage-updates-heading"><div class="coverage-section-heading"><span class="coverage-section-eyebrow">Current reporting</span><h2 id="coverage-updates-heading">Latest updates</h2><p>Newest first, labeled by the event or thread they affect.</p></div><div class="coverage-updates-list">';
		html += visible.map(updateHtml).join('') + '</div>';
		if (older.length) {
			html += '<details class="coverage-updates-more"><summary>Show ' + older.length + ' more update' + (older.length === 1 ? '' : 's') + '</summary><div class="coverage-updates-list">' + older.map(updateHtml).join('') + '</div></details>';
		}
		return html + '</section>';
	}

	function renderCoverageBackground(coverage, event) {
		var overview = coverage.overview || summaryText(event.event_overview) || summaryText(event.event_summary) || event.summary || '';
		if (!overview) return '';
		var image = eventImage(event);
		var eventOverview = event.event_overview || {};
		var sources = Array.isArray(eventOverview.sources) ? eventOverview.sources : [];
		var html = '<details class="coverage-background"><summary><span><span class="coverage-section-eyebrow">Reference</span><strong>Background and history</strong></span><span aria-hidden="true">+</span></summary><div class="coverage-background-body' + (image ? '' : ' coverage-background-body-no-image') + '"><div class="coverage-background-copy"><p>' + escapeHtml(overview) + '</p>';
		if (sources.length) html += '<div class="event-evidence"><div class="event-evidence-label">Background sources</div><div class="event-evidence-links">' + sourceLinks(sources.map(function (source) { return { link: source.url, source: source.publisher }; }), 8) + '</div></div>';
		html += '</div>';
		if (image) {
			html += '<figure class="coverage-background-image"><img src="' + escapeHtml(image.url) + '" alt="' + escapeHtml(image.alt) + '" style="object-position:' + (image.focalX * 100) + '% ' + (image.focalY * 100) + '%">';
			if (image.label) html += '<figcaption>' + escapeHtml(image.label) + '</figcaption>';
			html += '</figure>';
		}
		return html + '</div></details>';
	}

	function renderCoveragePage(container, event, coverage, allEvents) {
		var timeline = normalizeTimeline(event, null);
		var presentation = event.presentation || {};
		var title = coverage.title || presentation.base_title || event.topic_label || event.canonical_title || event.title || 'Ongoing coverage';
		var originDate = coverage.origin_date || '';
		var coverageBegins = coverage.coverage_begins || presentation.first_date || (timeline[0] || {}).date;
		var verifiedThrough = coverage.verified_through || presentation.latest_date || (timeline[timeline.length - 1] || {}).date;
		var html = '<section class="event-experience coverage-experience" aria-label="Ongoing coverage"><div class="event-experience-header">';
		html += '<div class="event-experience-kicker">Ongoing coverage</div><h1 class="event-experience-title">' + escapeHtml(title) + '</h1>';
		html += '<div class="event-experience-stats">';
		if (originDate) html += '<span class="event-stat">Conflict began ' + escapeHtml(formatDate(originDate, true)) + '</span>';
		if (coverageBegins) html += '<span class="event-stat">Coverage begins ' + escapeHtml(formatDate(coverageBegins, true)) + '</span>';
		if (verifiedThrough) html += '<span class="event-stat">Verified ' + escapeHtml(formatDate(verifiedThrough, true)) + '</span>';
		html += '</div></div>';
		html += renderCoverageLead(coverage, event, timeline);
		html += renderCoverageUpdates(coverage, timeline);
		html += renderCoverageMembers(coverage, allEvents, event);
		html += renderCoverageBackground(coverage, event);
		html += '</section>';
		container.innerHTML = html;
		return true;
	}

	function renderParentCoverage(parentCoverage) {
		if (!parentCoverage || !parentCoverage.legacy_event_id) return '';
		return '<nav class="event-coverage-breadcrumb" aria-label="Coverage hierarchy"><a href="/timeline.html?event=' + encodeURIComponent(parentCoverage.legacy_event_id) + '">' + escapeHtml(parentCoverage.title || 'Ongoing coverage') + '</a><span aria-hidden="true">→</span><span>Event</span></nav>';
	}

	function sourceLinks(details, limit) {
		var seenUrls = {};
		var seenPublishers = {};
		return details.map(function (item) {
			var url = safeHttpUrl(item && (item.link || item.url));
			var label = item && (item.source || item.name || item.publisher) || sourceLabelForUrl(url);
			return { url: url, label: label };
		}).filter(function (item) {
			var publisherKey = String(item.label || '').trim().toLowerCase();
			if (item.url === '#' || seenUrls[item.url] || (publisherKey && seenPublishers[publisherKey])) return false;
			seenUrls[item.url] = true;
			if (publisherKey) seenPublishers[publisherKey] = true;
			return true;
		}).slice(0, limit || 8).map(function (item) {
			return '<a class="event-evidence-link" href="' + escapeHtml(item.url) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(item.label) + '</a>';
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

	function eventDateRange(firstDate, latestDate) {
		if (!firstDate) return '';
		if (!latestDate || latestDate === firstDate) return formatDate(firstDate, true);
		var first = new Date(String(firstDate).length === 10 ? firstDate + 'T12:00:00Z' : firstDate);
		var latest = new Date(String(latestDate).length === 10 ? latestDate + 'T12:00:00Z' : latestDate);
		if (!isNaN(first.getTime()) && !isNaN(latest.getTime()) && first.getUTCFullYear() === latest.getUTCFullYear()) {
			var firstMonth = first.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
			var latestMonth = latest.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
			if (first.getUTCMonth() === latest.getUTCMonth()) {
				return firstMonth + ' ' + first.getUTCDate() + '–' + latest.getUTCDate() + ', ' + latest.getUTCFullYear();
			}
			return firstMonth + ' ' + first.getUTCDate() + '–' + latestMonth + ' ' + latest.getUTCDate() + ', ' + latest.getUTCFullYear();
		}
		return formatDate(firstDate, true) + '–' + formatDate(latestDate, true);
	}

	function developmentBody(entry, isCurrent) {
		if (!entry) return '';
		var facts = Array.isArray(entry.key_facts) ? entry.key_facts.filter(Boolean).slice(0, 5) : [];
		var details = entrySourceDetails(entry);
		var isBackfilled = Boolean(entry.backfilled || entry.origin === 'search_backfill');
		var html = '<div class="event-history-body">';
		if (entry.summary) html += '<p>' + escapeHtml(entry.summary) + '</p>';
		if (facts.length) html += '<ul class="event-key-facts">' + facts.map(function (fact) { return '<li>' + escapeHtml(fact) + '</li>'; }).join('') + '</ul>';
		if (isBackfilled) html += '<p class="event-history-note">This development was added from sourced historical reporting.</p>';
		if (details.length) {
			html += '<details class="event-source-disclosure"><summary>' + details.length + ' source' + (details.length === 1 ? '' : 's') + ' · View sources</summary><div class="event-evidence-links">' + sourceLinks(details, 8) + '</div></details>';
		}
		return html + '</div>';
	}

	function renderEventHistory(timeline, currentIndex) {
		if (!timeline.length) return '';
		var newestFirst = timeline.map(function (entry, index) { return { entry: entry, index: index }; }).reverse();
		var html = '<section class="event-history-region" id="event-history" aria-labelledby="event-history-heading"><div class="event-history-heading"><div><span class="event-rail-eyebrow">Event history</span><h2 id="event-history-heading">Event timeline</h2><p>Newest first. Open any development for its summary, facts and sources.</p></div>';
		if (timeline.length > 1) html += '<button type="button" class="event-order-button" data-event-order aria-pressed="false">Read from the beginning</button>';
		html += '</div><div class="event-history-list" data-event-history>';
		newestFirst.forEach(function (item) {
			var entry = item.entry;
			var isCurrent = item.index === currentIndex;
			var details = entrySourceDetails(entry);
			html += '<details class="event-history-item"' + (isCurrent ? ' open' : '') + '><summary><span class="event-history-summary-copy"><span class="event-history-summary-meta">';
			if (entry.date) html += '<time datetime="' + escapeHtml(entry.date) + '">' + escapeHtml(formatDate(entry.date, true)) + '</time>';
			if (isCurrent) html += '<span>Latest</span>';
			html += '</span><strong>' + escapeHtml(entry.title || 'Update') + '</strong></span>';
			if (details.length) html += '<span class="event-history-source-count">' + details.length + ' source' + (details.length === 1 ? '' : 's') + '</span>';
			html += '</summary>' + developmentBody(entry, isCurrent) + '</details>';
		});
		return html + '</div></section>';
	}

	function renderEventPage(container, event, options) {
		var context = {};
		var presentation = event.presentation || {};
		var timeline = normalizeTimeline(event, null);
		if (!timeline.length) { container.innerHTML = ''; return false; }
		var currentIndex = timeline.length - 1;
		var firstDate = presentation.first_date || (timeline[0] || {}).date;
		var latestDate = presentation.latest_date || (timeline[timeline.length - 1] || {}).date;
		var title = options.titleOverride || presentation.base_title || event.topic_label || event.canonical_title || event.title || 'Developing event';
		var html = '<section class="event-experience event-page-experience" aria-label="Event context"><div class="event-experience-header">';
		html += renderParentCoverage(options.parentCoverage);
		html += '<div class="event-experience-kicker">Developing event</div><h1 class="event-experience-title">' + escapeHtml(title) + '</h1>';
		html += '<div class="event-experience-stats">';
		if (firstDate) html += '<span class="event-stat">' + escapeHtml(eventDateRange(firstDate, latestDate)) + '</span>';
		html += '<span class="event-stat">' + timeline.length + ' development' + (timeline.length === 1 ? '' : 's') + '</span>';
		if (latestDate) html += '<span class="event-stat">Updated ' + escapeHtml(formatDate(latestDate, true)) + '</span>';
		html += '</div></div>';
		html += renderEventLead(event, context, timeline, currentIndex, 'What happened', options.summaryOverride);
		html += renderEventHistory(timeline, currentIndex);
		html += renderRelated(event, context);
		html += '</section>';
		container.innerHTML = html;
		var orderButton = container.querySelector('[data-event-order]');
		var historyList = container.querySelector('[data-event-history]');
		if (orderButton && historyList) {
			orderButton.addEventListener('click', function () {
				var oldestFirst = orderButton.getAttribute('aria-pressed') !== 'true';
				var items = Array.prototype.slice.call(historyList.children);
				items.reverse().forEach(function (item) { historyList.appendChild(item); });
				orderButton.setAttribute('aria-pressed', String(oldestFirst));
				orderButton.textContent = oldestFirst ? 'Newest first' : 'Read from the beginning';
			});
		}
		return true;
	}

	function renderRelated(event, context) {
		var related = Array.isArray(event && event.related_events) && event.related_events.length ? event.related_events : context.related_events;
		if (!Array.isArray(related) || !related.length) return '';
		var reviewed = related.filter(function (item) {
			var state = String(item && (item.editorial_state || item.review_state || item.relationship_state) || '').toLowerCase();
			return state === 'confirmed' || state === 'approved' || state === 'reviewed';
		});
		if (!reviewed.length) return '';
		return '<section class="event-related" aria-labelledby="related-coverage-heading"><h2 id="related-coverage-heading">Related coverage</h2><div class="event-related-links">' + reviewed.slice(0, 4).map(function (item) {
			return '<a class="event-related-link" href="/timeline.html?event=' + encodeURIComponent(item.event_id || '') + '">' + escapeHtml(item.title || 'Related event') + '</a>';
		}).join('') + '</div></section>';
	}

	function mount(target, options) {
		var container = typeof target === 'string' ? document.querySelector(target) : target;
		if (!container) return false;
		options = options || {};
		var event = options.event || {};
		var story = options.story || null;
		if (options.mode === 'page') {
			if (options.coverage) return renderCoveragePage(container, event, options.coverage, options.allEvents || []);
			return renderEventPage(container, event, options);
		}
		var context = story && story.story_context || {};
		var presentation = event.presentation || {};
		var timeline = normalizeTimeline(event, story);
		if (timeline.length < 2 && !context.available && !presentation.has_context) { container.innerHTML = ''; return false; }
		var currentId = story && (story.story_id || story.cluster_id) || '';
		var currentIndex = timeline.findIndex(function (entry) { return entry.development_id === currentId || entry.daily_story_id === currentId; });
		if (currentIndex < 0) currentIndex = timeline.length - 1;
		var hasFullTimeline = Boolean(presentation.has_full_timeline || context.full_timeline_available);
		var stage = presentation.stage || event.event_stage || (hasFullTimeline ? 'timeline' : 'developing_event');
		var milestones = options.mode === 'page'
			? timeline.map(function (_entry, index) { return index; })
			: selectedMilestoneIndexes(timeline, currentIndex);
		var milestoneLookup = {};
		milestones.forEach(function (index) { milestoneLookup[index] = true; });
		var title = options.titleOverride || (options.mode === 'page'
			? (presentation.base_title || event.topic_label || event.canonical_title || event.title || displayTitle(event, story, stage))
			: displayTitle(event, story, stage));
		var firstDate = presentation.first_date || (timeline[0] || {}).date;
		var latestDate = presentation.latest_date || (timeline[timeline.length - 1] || {}).date;
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
			railHtml += '<div class="' + classes + '"><button class="event-node-button' + (isCurrent ? ' is-current' : '') + '" id="event-development-tab-' + index + '" type="button" role="tab" aria-controls="event-development-panel" aria-selected="' + (isCurrent ? 'true' : 'false') + '" tabindex="' + (isCurrent ? '0' : '-1') + '" data-development-index="' + index + '">';
			railHtml += '<span class="event-node-date">' + escapeHtml(formatDate(entry.date, true)) + '</span><span class="event-node-name">' + escapeHtml(entry.title || 'Update') + '</span>';
			if (isBackfilled) railHtml += '<span class="event-node-backfill">Sourced backfill</span>';
			if (isCurrent) railHtml += '<span class="event-node-current">Current</span>';
			railHtml += '</button></div>';
		});

		var stageLabel = options.parentCoverage
			? 'Developing event'
			: stage === 'timeline'
			? 'Ongoing coverage'
			: (presentation.stage_label || 'Developing event');
		var headingTag = options.mode === 'page' ? 'h1' : 'h2';
		var html = '<section class="event-experience" aria-label="Event context"><div class="event-experience-header">';
		html += '<div class="event-experience-kicker">' + escapeHtml(options.mode === 'page' ? stageLabel : 'Part of a ' + stageLabel.toLowerCase()) + '</div>';
		html += '<' + headingTag + ' class="event-experience-title">' + escapeHtml(title) + '</' + headingTag + '>';
		html += '<div class="event-experience-stats"><span class="event-stat">' + timeline.length + ' developments</span>';
		if (firstDate) html += '<span class="event-stat">Tracking since ' + escapeHtml(formatDate(firstDate, true)) + '</span>';
		if (latestDate && latestDate !== firstDate) html += '<span class="event-stat">Updated ' + escapeHtml(formatDate(latestDate, true)) + '</span>';
		if (sourceCount) html += '<span class="event-stat">' + escapeHtml(sourceCount) + ' publisher' + (sourceCount === 1 ? '' : 's') + '</span>';
		html += '</div></div>' + renderParentCoverage(options.parentCoverage) + renderEventLead(event, context, timeline, currentIndex, options.mode === 'page' ? 'What happened' : 'Story so far', options.summaryOverride) + '<section class="event-rail-region" id="event-history" aria-labelledby="event-history-heading"><div class="event-rail-label"><div><span class="event-rail-eyebrow">Event history</span><h2 id="event-history-heading">Follow the developments</h2><span class="event-rail-hint">Newest update selected · swipe or use the arrows</span></div><div class="event-rail-controls" aria-label="Timeline controls"><button type="button" data-rail-previous aria-label="Show earlier developments">←</button><button type="button" data-rail-next aria-label="Show later developments">→</button></div></div>';
		html += '<div class="event-rail-scroll"><div class="event-rail" role="tablist" aria-label="Event developments">' + railHtml + '</div></div>';
		html += '<article class="event-development" id="event-development-panel" role="tabpanel" aria-labelledby="event-development-tab-' + currentIndex + '" data-event-development tabindex="-1">' + developmentDetail(timeline[currentIndex], true) + '</article></section>';
		html += renderRelated(event, context) + '</section>';
		container.innerHTML = html;

		var rail = container.querySelector('.event-rail');
		var railScroll = container.querySelector('.event-rail-scroll');
		var detail = container.querySelector('[data-event-development]');
		function selectDevelopment(index, focusDetail) {
			container.querySelectorAll('[data-development-index]').forEach(function (button) {
				var selected = Number(button.getAttribute('data-development-index')) === index;
				button.setAttribute('aria-selected', String(selected));
				button.setAttribute('tabindex', selected ? '0' : '-1');
			});
			detail.setAttribute('aria-labelledby', 'event-development-tab-' + index);
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
		var previousButton = container.querySelector('[data-rail-previous]');
		var nextButton = container.querySelector('[data-rail-next]');
		function moveRail(direction) {
			if (!railScroll) return;
			var amount = Math.max(260, Math.min(620, railScroll.clientWidth * 0.82));
			railScroll.scrollBy({ left: amount * direction, behavior: 'smooth' });
		}
		function updateRailControls() {
			if (!railScroll) return;
			var maxScroll = Math.max(0, railScroll.scrollWidth - railScroll.clientWidth);
			if (previousButton) previousButton.disabled = railScroll.scrollLeft <= 2;
			if (nextButton) nextButton.disabled = railScroll.scrollLeft >= maxScroll - 2;
		}
		if (previousButton) previousButton.addEventListener('click', function () { moveRail(-1); });
		if (nextButton) nextButton.addEventListener('click', function () { moveRail(1); });
		if (railScroll) railScroll.addEventListener('scroll', updateRailControls, { passive: true });
		var currentButton = container.querySelector('[data-development-index="' + currentIndex + '"]');
		if (currentButton && railScroll) {
			global.requestAnimationFrame(function () {
				var currentItem = currentButton.closest('.event-rail-item');
				railScroll.scrollLeft = Math.max(0, currentItem.offsetLeft + currentItem.offsetWidth - railScroll.clientWidth);
				updateRailControls();
			});
		} else {
			updateRailControls();
		}
		return true;
	}

	global.MuninnEventExperience = {
		escapeHtml: escapeHtml, formatDate: formatDate, mount: mount,
		renderSourceBadges: renderSourceBadges, safeHttpUrl: safeHttpUrl,
		sourceLabelForUrl: sourceLabelForUrl
	};
})(window);
