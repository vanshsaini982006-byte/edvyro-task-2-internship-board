'use strict';

// Front end for the Internship Board. It only talks to the REST API (/api/...)
// and builds all page content with textContent, so API data can never inject HTML.

(function () {
  var PAGE_SIZE = 6;

  function byId(id) { return document.getElementById(id); }

  var els = {
    form: byId('filter-form'),
    search: byId('search'),
    domain: byId('domain'),
    mode: byId('mode'),
    clear: byId('clear-filters'),
    results: byId('results'),
    summary: byId('result-summary'),
    loading: byId('state-loading'),
    error: byId('state-error'),
    errorText: byId('state-error-text'),
    retry: byId('retry-list'),
    empty: byId('state-empty'),
    emptyClear: byId('empty-clear'),
    list: byId('card-list'),
    pagination: byId('pagination'),
    prev: byId('page-prev'),
    next: byId('page-next'),
    pageStatus: byId('page-status'),

    dialog: byId('details-dialog'),
    dialogTitle: byId('dialog-title'),
    dialogClose: byId('dialog-close'),
    dialogLoading: byId('dialog-loading'),
    dialogError: byId('dialog-error'),
    dialogErrorText: byId('dialog-error-text'),
    dialogRetry: byId('dialog-retry'),
    dialogContent: byId('dialog-content'),
    detailDomain: byId('detail-domain'),
    detailMode: byId('detail-mode'),
    detailLocation: byId('detail-location'),
    detailOpenings: byId('detail-openings'),
    detailSkills: byId('detail-skills'),
    noOpenings: byId('no-openings'),

    applyForm: byId('apply-form'),
    nameInput: byId('applicant-name'),
    emailInput: byId('applicant-email'),
    nameError: byId('applicant-name-error'),
    emailError: byId('applicant-email-error'),
    applyError: byId('apply-error'),
    applySuccess: byId('apply-success'),
    applySubmit: byId('apply-submit')
  };

  var state = { page: 1, search: '', domain: '', mode: '' };
  var latestListRequest = 0;
  var lastTrigger = null;
  var currentInternshipId = null;
  var totalPages = 1;

  // ---------- API helper ----------

  function ApiRequestError(message, details) {
    this.message = message;
    this.code = details.code;
    this.fields = details.fields;
    this.httpStatus = details.httpStatus;
  }

  function apiRequest(path, options) {
    return fetch('/api' + path, options).then(
      function (response) {
        return response.json().then(
          function (payload) { return { response: response, payload: payload }; },
          function () { return { response: response, payload: null }; }
        );
      },
      function () {
        throw new ApiRequestError('Could not reach the server. Check that it is running, then try again.', { code: 'NETWORK_ERROR' });
      }
    ).then(function (result) {
      var payload = result.payload;
      if (!result.response.ok || !payload || payload.status !== 'success') {
        var error = payload && payload.error ? payload.error : {};
        throw new ApiRequestError(error.message || 'Something went wrong. Please try again.', {
          code: error.code,
          fields: error.fields,
          httpStatus: result.response.status
        });
      }
      return payload;
    });
  }

  // ---------- Small DOM helper ----------

  function make(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function openingsText(count) {
    if (count === 0) return 'No openings';
    return count + (count === 1 ? ' opening' : ' openings');
  }

  // ---------- Internship list ----------

  function showView(view) {
    els.loading.hidden = view !== 'loading';
    els.error.hidden = view !== 'error';
    els.empty.hidden = view !== 'empty';
    els.list.hidden = view !== 'results';
    if (view !== 'results') els.pagination.hidden = true;
  }

  function renderCards(items) {
    els.list.textContent = '';
    items.forEach(function (item) {
      var card = make('li', 'card');
      card.appendChild(make('h3', 'card-title', item.title));
      card.appendChild(make('p', 'card-domain', item.domain));

      var facts = make('ul', 'card-facts');
      facts.appendChild(make('li', '', item.mode));
      facts.appendChild(make('li', '', item.location));
      facts.appendChild(make('li', '', openingsText(item.openings)));
      card.appendChild(facts);

      var skills = make('ul', 'chips');
      skills.setAttribute('aria-label', 'Skills');
      item.skills.forEach(function (skill) { skills.appendChild(make('li', '', skill)); });
      card.appendChild(skills);

      var button = make('button', 'btn', 'View details');
      button.type = 'button';
      button.setAttribute('aria-label', 'View details for ' + item.title);
      button.addEventListener('click', function () { openDetails(item.id, button); });
      card.appendChild(button);

      els.list.appendChild(card);
    });
  }

  function renderPagination(pagination) {
    totalPages = pagination.totalPages;
    els.pagination.hidden = pagination.totalPages <= 1;
    els.pageStatus.textContent = 'Page ' + pagination.page + ' of ' + pagination.totalPages;
    // aria-disabled (not disabled) keeps keyboard focus on the button after it is pressed.
    els.prev.setAttribute('aria-disabled', String(pagination.page <= 1));
    els.next.setAttribute('aria-disabled', String(pagination.page >= pagination.totalPages));
  }

  function loadInternships() {
    var requestId = ++latestListRequest;
    showView('loading');
    els.summary.textContent = 'Loading internships…';

    var params = new URLSearchParams({ page: String(state.page), limit: String(PAGE_SIZE) });
    if (state.search) params.set('search', state.search);
    if (state.domain) params.set('domain', state.domain);
    if (state.mode) params.set('mode', state.mode);

    return apiRequest('/internships?' + params.toString()).then(
      function (payload) {
        if (requestId !== latestListRequest) return; // a newer request replaced this one
        var items = payload.data;
        var pagination = payload.pagination;

        if (items.length === 0 && pagination.total > 0 && state.page > 1) {
          state.page = pagination.totalPages; // page no longer exists (data changed): go to the last one
          return loadInternships();
        }
        if (items.length === 0) {
          showView('empty');
          els.summary.textContent = 'No internships found.';
          return;
        }

        renderCards(items);
        renderPagination(pagination);
        showView('results');
        els.pagination.hidden = pagination.totalPages <= 1;
        var first = (pagination.page - 1) * pagination.limit + 1;
        var last = first + items.length - 1;
        els.summary.textContent = 'Showing ' + first + '–' + last + ' of ' + pagination.total +
          (pagination.total === 1 ? ' internship' : ' internships');
      },
      function (error) {
        if (requestId !== latestListRequest) return;
        els.errorText.textContent = error.message;
        showView('error');
        els.summary.textContent = '';
      }
    );
  }

  function loadDomainOptions() {
    return apiRequest('/internships?limit=100').then(function (payload) {
      var seen = {};
      payload.data.forEach(function (item) { seen[item.domain] = true; });
      Object.keys(seen).sort(function (a, b) { return a.localeCompare(b); }).forEach(function (name) {
        var option = make('option', '', name);
        option.value = name;
        els.domain.appendChild(option);
      });
    }).catch(function () {
      // The list request reports connection problems, so nothing to do here.
    });
  }

  function applyFilters() {
    state.search = els.search.value.trim();
    state.domain = els.domain.value;
    state.mode = els.mode.value;
    state.page = 1;
    loadInternships();
  }

  function clearFilters() {
    els.search.value = '';
    els.domain.value = '';
    els.mode.value = '';
    applyFilters();
    els.search.focus();
  }

  function changePage(delta, button) {
    if (button.getAttribute('aria-disabled') === 'true') return;
    var target = state.page + delta;
    if (target < 1 || target > totalPages) return;
    state.page = target;
    loadInternships();
  }

  // ---------- Details dialog ----------

  function showDialogView(view) {
    els.dialogLoading.hidden = view !== 'loading';
    els.dialogError.hidden = view !== 'error';
    els.dialogContent.hidden = view !== 'content';
  }

  function clearApplyMessages() {
    els.nameError.textContent = '';
    els.emailError.textContent = '';
    els.nameInput.removeAttribute('aria-invalid');
    els.emailInput.removeAttribute('aria-invalid');
    els.applyError.textContent = '';
    els.applySuccess.textContent = '';
  }

  function fillDetails(item) {
    els.dialogTitle.textContent = item.title;
    els.detailDomain.textContent = item.domain;
    els.detailMode.textContent = item.mode;
    els.detailLocation.textContent = item.location;
    els.detailOpenings.textContent = openingsText(item.openings);
    els.detailSkills.textContent = '';
    item.skills.forEach(function (skill) { els.detailSkills.appendChild(make('li', '', skill)); });

    var open = item.openings > 0;
    els.noOpenings.hidden = open;
    els.applyForm.hidden = !open;
  }

  function loadDetails() {
    var id = currentInternshipId;
    showDialogView('loading');
    apiRequest('/internships/' + encodeURIComponent(id)).then(
      function (payload) {
        if (id !== currentInternshipId) return;
        fillDetails(payload.data);
        showDialogView('content');
      },
      function (error) {
        if (id !== currentInternshipId) return;
        els.dialogErrorText.textContent = error.message;
        showDialogView('error');
      }
    );
  }

  function openDetails(id, trigger) {
    lastTrigger = trigger;
    currentInternshipId = id;
    els.dialogTitle.textContent = 'Internship details';
    els.applyForm.reset();
    clearApplyMessages();
    if (!els.dialog.open) els.dialog.showModal(); // modal <dialog>: traps focus, Esc closes it
    loadDetails();
  }

  function closeDialog() {
    if (els.dialog.open) els.dialog.close();
  }

  // ---------- Application form ----------

  function showFieldErrors(problems) {
    var firstInvalid = null;
    if (problems.applicant_name) {
      els.nameError.textContent = problems.applicant_name;
      els.nameInput.setAttribute('aria-invalid', 'true');
      firstInvalid = firstInvalid || els.nameInput;
    }
    if (problems.applicant_email) {
      els.emailError.textContent = problems.applicant_email;
      els.emailInput.setAttribute('aria-invalid', 'true');
      firstInvalid = firstInvalid || els.emailInput;
    }
    if (firstInvalid) firstInvalid.focus();
  }

  function submitApplication(event) {
    event.preventDefault();
    clearApplyMessages();

    var name = els.nameInput.value.trim();
    var email = els.emailInput.value.trim();
    var problems = {};
    if (!name) problems.applicant_name = 'Enter your full name.';
    if (!email) problems.applicant_email = 'Enter your email address.';
    else if (!/^\S+@\S+\.\S+$/.test(email)) problems.applicant_email = 'Enter a valid email address, like name@example.com.';
    if (problems.applicant_name || problems.applicant_email) {
      showFieldErrors(problems);
      return;
    }

    els.applySubmit.disabled = true;
    apiRequest('/applications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ internship_id: currentInternshipId, applicant_name: name, applicant_email: email })
    }).then(
      function () {
        els.applyForm.reset();
        els.applySuccess.textContent = 'Application submitted. Thank you for applying.';
      },
      function (error) {
        var fields = error.fields || {};
        if (fields.applicant_name || fields.applicant_email) {
          showFieldErrors(fields);
        } else {
          els.applyError.textContent = error.message;
        }
      }
    ).then(function () {
      els.applySubmit.disabled = false;
    });
  }

  // ---------- Wire up events ----------

  els.form.addEventListener('submit', function (event) { event.preventDefault(); applyFilters(); });
  els.domain.addEventListener('change', applyFilters);
  els.mode.addEventListener('change', applyFilters);
  els.clear.addEventListener('click', clearFilters);
  els.emptyClear.addEventListener('click', clearFilters);
  els.retry.addEventListener('click', loadInternships);
  els.prev.addEventListener('click', function () { changePage(-1, els.prev); });
  els.next.addEventListener('click', function () { changePage(1, els.next); });

  els.dialogClose.addEventListener('click', closeDialog);
  els.dialogRetry.addEventListener('click', loadDetails);
  els.applyForm.addEventListener('submit', submitApplication);
  // Clicking the dark area outside the dialog box closes it.
  els.dialog.addEventListener('click', function (event) { if (event.target === els.dialog) closeDialog(); });
  // Return keyboard focus to the "View details" button that opened the dialog.
  els.dialog.addEventListener('close', function () {
    currentInternshipId = null;
    if (lastTrigger && document.contains(lastTrigger)) lastTrigger.focus();
  });

  loadDomainOptions();
  loadInternships();
})();
