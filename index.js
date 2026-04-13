(function (){
  let assessmentOptions = null
  let assessment = null
  let processing = false
  let showAsDiff = false
  let currentData = null
  let expanded = false

  const LONG_OUTPUT_LENGTH = 20000

  const dummyResult = {
    "points": 40,
    "guidance": "<p><strong>Rationale</strong></p>\n",
    "usedAttempts": 1,
    "timestamp": "2026-04-01T10:23:33.229Z",
    "code": 2,
    "output": "{\"sequence\": [{\"returnCode\": 0, \"stderr\": \"\", \"passed\": true, \"stdout\": \"5\\n\"}, {\"returnCode\": 0, \"stderr\": \"\", \"passed\": true, \"stdout\": \"4\\n\"}, {\"returnCode\": 0, \"stderr\": \"\", \"passed\": false, \"stdout\": \"6\\n\"}, {\"returnCode\": 0, \"stderr\": \"\", \"passed\": false, \"stdout\": \"2\\n\"}, {\"returnCode\": 0, \"stderr\": \"\", \"passed\": false, \"stdout\": \"2\\n\"}]}",
    "state": "pass"
  }
  const dummySource = {
    "name": "standard partial arguments count",
    "showName": true,
    "settings": {
      "instructions": "<p><em>Instructions here</em></p>\n",
      "command": "python code_tests/standard_partial_argumentscount.py",
      "preExecuteCommand": "",
      "timeout": 30
    },
    "options": {
      "ignoreCase": false,
      "ignoreWhitespaces": true,
      "ignoreNewline": true,
      "matchSubstring": false
    },
    "metadata": {
      "tags": [
        {
          "name": "Assessment Type",
          "value": "Standard Code Test"
        },
        {
          "name": "Content",
          "value": "code test"
        },
        {
          "name": "Programming Language",
          "value": "python"
        }
      ],
      "files": [
        "code_tests/standard_partial_argumentscount.py"
      ],
      "opened": []
    },
    "bloomsObjectiveLevel": "1",
    "learningObjectives": "learning",
    "guidance": "<p><strong>Rationale</strong></p>\n",
    "showGuidanceAfterResponseOption": {
      "type": "Always"
    },
    "maxAttemptsCount": 0,
    "points": 100,
    "showExpectedAnswerOption": {
      "type": "Always"
    },
    "arePartialPointsAllowed": true,
    "useMaximumScore": false,
    "sequence": [
      {
        "arguments": "one two three four",
        "input": "",
        "output": "5",
        "showFeedback": false,
        "feedback": ""
      },
      {
        "arguments": "1 2 3",
        "input": "",
        "output": "4",
        "showFeedback": false,
        "feedback": ""
      },
      {
        "arguments": "1 2 3 4 5",
        "input": "",
        "output": "10",
        "showFeedback": false,
        "feedback": ""
      },
      {
        "arguments": "1",
        "input": "",
        "output": "4",
        "showFeedback": false,
        "feedback": ""
      },
      {
        "arguments": "1",
        "input": "",
        "output": "4",
        "showFeedback": false,
        "feedback": ""
      }
    ]
  }

  const isEmptyObject = (obj) => {
    for (const prop in obj) {
      if (Object.hasOwn(obj, prop)) {
        return false;
      }
    }

    return true;
  }

  const updateProcessing = (status) => {
    processing = status
    refreshResultAndFooter()
  }

  const applyStateInitial = (data) => {
    const {state, result, ...dataWithoutState} = data
    assessment = dataWithoutState.assessment
    // todo remove dummy start
    assessment.source = dummySource
    // todo remove dummy end

    assessmentOptions = dataWithoutState.options

    render()
  }

  const applyState = (data) => {
    console.log('assessment iframe applyState', data)
    // todo remove dummy start
    data.result  = dummyResult
    // todo remove dummy end
    currentData = data
    if (!assessment) {
      applyStateInitial(data)
      return
    }
    if (data.state) {
      renderResult()
      refreshResultAndFooter()
      renderGuidance()
      return
    }
    // reset
    if (currentData.state && !data.state) {
      renderResult()
      refreshResultAndFooter()
      renderGuidance()
    }
  }

  const onCheck = (event) => {
    event.preventDefault()
    updateProcessing(true)

    window.codioAssessmentsHelper.send(
      window.codioAssessmentsHelper.METHODS.SUBMIT_ANSWER
    )
  }

  const onUnblock = (event) => {
    event.preventDefault()
    codioAssessmentsHelper.send(window.codioAssessmentsHelper.METHODS.UNBLOCK)
  }

  const onReset = (event) => {
    event.preventDefault()
    codioAssessmentsHelper.send(window.codioAssessmentsHelper.METHODS.RESET)
  }

  const renderContent = () => {
    $('.instructions-text').html(assessment.source.settings.instructions)
  }

  const updateVisibility = (el, visible) => {
    visible ? el.removeClass('hide') : el.addClass('hide')
  }

  const hasDiff = () => {
    if (!currentData?.result?.output) {
      return false
    }
    let parsed
    try {
      parsed = JSON.parse(currentData?.result.output)
      if (!parsed.sequence) {
        return false
      }
    } catch {
      return false
    }

    return parsed.sequence.some((item, pos) => {
      if (item && !item.passed) {
        const showExpectedAnswer = window.codioAssessmentsHelper.calculateShowExpectedAnswer(
          assessmentOptions.eduStartedAssignment,
          assessment.source.showExpectedAnswerOption
        )
        const showAnswerFromSource = assessmentOptions.showAsTeacher || showExpectedAnswer
        const sourceSequence = assessment.source.sequence && assessment.source.sequence[pos]
        const sourceExpectedOutput = assessment.source.expectedOutputs && assessment.source.expectedOutputs[pos]
        const resultExpectedOutput = !assessment.source.sequence &&
          currentData?.result?.expectedOutputs && currentData?.result?.expectedOutputs[pos]
        const expectedResult = (showAnswerFromSource && (sourceSequence || sourceExpectedOutput)) ||
          resultExpectedOutput
        return !!expectedResult
      }
      return false
    })
  }

  const updateFooterButtons = () => {
    const assessmentState = getAssessmentState()
    const {teacherInStudentsProject, showModify, isDisabled, canAnswerAgain, answered} = assessmentState

    const checkVisibility = !showModify && assessmentOptions.useSubmitButtons
    const checkBtn = $('.check-button')
    updateVisibility(checkBtn, checkVisibility)
    checkBtn.attr('disabled', isDisabled)

    const unblockVisibility = !teacherInStudentsProject && showModify
    updateVisibility($('.unblock-button'), unblockVisibility)

    const state = processing ? window.codioAssessmentsHelper.States.PROGRESS : currentData?.result?.state
    const resetVisibility = !showModify && answered && assessmentOptions.owner &&
      state !== window.codioAssessmentsHelper.States.PROGRESS && !canAnswerAgain
    updateVisibility($('.reset-button'), resetVisibility)

    const diffBtn = $('.diff-button')
    const diffBtnTitle = showAsDiff ? 'Show output' : 'Show diff'
    updateVisibility(diffBtn, hasDiff())
    diffBtn.html(diffBtnTitle)
  }

  const renderFooter = () => {
    const footerContainer = $('.codio-assessment-footer')
    const caption = window.codioAssessmentsHelper.getButtonCaption(assessmentOptions, assessment.source.maxAttemptsCount)
    footerContainer.find('.check-button').html(caption)
  }

  const renderGuidance = () => {
    const guidanceBlock = $('.codio-assessment-guidance-block')
    guidanceBlock.empty()
    const assessmentState = getAssessmentState()
    const {result} = currentData || {}
    const guidance = window.codioAssessmentsHelper.calculateGuidance(
      !assessmentOptions.eduStartedAssignment,
      assessmentOptions.showAsTeacher,
      assessmentState.answered,
      assessment.source,
      result ?
        {
          answerGuidance: result.guidance,
          answerPoints: result.points,
          attemptsCount: result.usedAttempts,
          passed: result.state === window.codioAssessmentsHelper.States.PASS,
          isCompletedAndReleased: window.codioAssessmentsHelper.calculateCompletedAndReleased(
            assessmentOptions.eduStartedAssignment
          )
        } : {}
    )
    if (guidance) {
      const guidanceContainer = $('<div class="codio-assessment-guidance-container" />')
      const guidanceText = $('<div class="codio-assessment-guidance-text">').html(guidance)
      guidanceContainer.append(guidanceText)
      guidanceBlock.append(guidanceContainer)
    }
  }

  const onExpandClick = () => {
    const {EXPAND, COLLAPSE} = window.codioAssessmentsHelper.METHODS
    const action = expanded ? COLLAPSE :EXPAND
    expanded = !expanded
    window.codioAssessmentsHelper.send(action)
  }

  const getValidHtml = (text) => {
    return new DOMParser().parseFromString(text, 'text/html').querySelector("body").innerHTML
  }

  const diffOutput = (expectedOutput, output) => {
    const dmp = new window.DiffMatchPatch()
    const pattern_para = /\n/g
    const diff = dmp.diff_main(output, expectedOutput)
    dmp.diff_cleanupSemantic(diff)
    const diffItems = diff.map(item => {
      const text = item[1].replace(pattern_para, '&para;<br>')
      switch (item[0]) {
        case 1:
          return `<ins class='codio-assessment-output-diff-ins'>${getValidHtml(text)}</ins>`
        case -1:
          return `<del class='codio-assessment-output-diff-del'>${getValidHtml(text)}</del>`
        case 0:
        default:
          return getValidHtml(text)
      }
    })

    return `<div class='codio-output-diff'><pre>${diffItems.join('')}</pre></div>`
  }

  const renderOutput = () => {
    const {showAsTeacher, eduStartedAssignment} = assessmentOptions
    const result = currentData?.result
    const currentState = processing ? window.codioAssessmentsHelper.States.PROGRESS : result?.state
    const resultClasses = `codio-assessment-result-output codio-assessment-result-output-${currentState}`
    let output = null
    let currentLimit = LONG_OUTPUT_LENGTH

    function cutOutput(inputText) {
      return inputText.length < currentLimit ? inputText : inputText.substring(0, currentLimit) + '\n...'
    }

    if (result?.output) {
      try {
        const parsed = JSON.parse(result.output)
        const sequenceSize = parsed?.sequence.length || 0
        if (sequenceSize > 0) {
          currentLimit =  LONG_OUTPUT_LENGTH / sequenceSize
        }
        if (parsed.sequence) {
          output = parsed.sequence.map((item, pos) => {
            let state = `<span class='codio-assessment-result-error-text'>failed</span>`
            let reason = ''
            let feedback = ''
            if (item && item.passed) {
              state = `<span class='codio-assessment-result-success-text'>passed</span>`
            } else {
              let expectedStr = ''
              const showExpectedAnswer = window.codioAssessmentsHelper.calculateShowExpectedAnswer(
                eduStartedAssignment,
                assessment.source.showExpectedAnswerOption
              )
              const showAnswerFromSource = showAsTeacher || showExpectedAnswer
              const sourceSequence = assessment.source.sequence && assessment.source.sequence[pos]
              const sourceExpectedOutput = assessment.source.expectedOutputs &&
                !isEmptyObject(assessment.source.expectedOutputs[pos]) &&
                assessment.source.expectedOutputs[pos]
              const resultExpectedOutput = !assessment.source.sequence &&
                result.expectedOutputs && !isEmptyObject(result.expectedOutputs[pos]) && result.expectedOutputs[pos]
              const expectedResult = (showAnswerFromSource && (sourceSequence || sourceExpectedOutput)) ||
                resultExpectedOutput
              if (expectedResult) {
                if (showAsDiff) {
                  const truncatedOutput = cutOutput(item.stdout + item.stderr)
                  reason = diffOutput(expectedResult.output, truncatedOutput)
                } else {
                  const escapedExpectedOutput = window.codioAssessmentsHelper.escapeHTML(expectedResult.output)
                  expectedStr = `Expected:<div class='codio-assessment-expected-output-text'>${escapedExpectedOutput}</div>`

                  const outputText = cutOutput(window.codioAssessmentsHelper.escapeHTML(item.stdout + item.stderr))
                  const outputStr = `Output:<div class='codio-assessment-output-text'>${outputText}</div>`

                  reason = `<pre>${outputStr}${expectedStr}</pre>`
                }
              }
            }
            if (!item.passed) {
              const sourceSequence = assessment.source.sequence && assessment.source.sequence[pos]
              const sourceFeedback = sourceSequence && sourceSequence.showFeedback && sourceSequence.feedback
              const resultFeedbackObject = !assessment.source.sequence && assessment.source.feedbacks &&
                assessment.source.feedbacks[pos]
              const feedbackToShow = sourceFeedback || (resultFeedbackObject.show && resultFeedbackObject.feedback)
              if (feedbackToShow && !showAsDiff) {
                const escapedFeedback = window.codioAssessmentsHelper.escapeHTML(feedbackToShow)
                feedback = `<pre>Feedback:<div class='codio-feedback-text'>${escapedFeedback}</div></pre>`
              }
            }
            return `<div class="codio-assessment-output-line">Check ${pos + 1} ${state}${reason}${feedback}</div>`
          }).join('')
        } else if (parsed.error) {
          const errorOutput = cutOutput(parsed.error)
          output = `<div class="codio-assessment-output-line">Error: ${errorOutput}</div>`
        }
      } catch {
        output = cutOutput(result.output)
      }
    }
    const outputEl = $(`<div class="${resultClasses}"></div>`)
    outputEl.attr('tabIndex', 0)
    outputEl.attr('aria-label', `Scrollable feedback ${assessment.source.showName ? assessment.source.name : ''}`)
    outputEl.html(result?.state !== window.codioAssessmentsHelper.States.RESET ? output : '')

    return outputEl
  }

  const renderResult = () => {
    const assessmentState = getAssessmentState()
    const resultBlock = $('.codio-assessment-results-block')
    resultBlock.empty()
    if (!assessmentState.answered && !processing) {
      return
    }
    const result = currentData?.result
    const state = processing ? window.codioAssessmentsHelper.States.PROGRESS : result?.state
    const resultEl = $(`<div class="codio-assessment-result ${state}"></div>`)

    const assessmentStatus = window.codioAssessmentsHelper.getAssessmentResultStatus(
      assessment.source, result, processing
    )
    const iconStr = window.codioAssessmentsHelper.getIconByResultStatus(assessmentStatus)
    const iconEl = $(iconStr).addClass(`codio-assessment-result-status-icon ${assessmentStatus}`)
    const iconContainer = $('<div class="codio-assessment-result-icon-container"></div>')
    iconContainer.append(iconEl)
    resultEl.append(iconContainer)
    const resultInfoContainer = $('<div class="codio-assessment-result-result-info-container"></div>')

    if (result?.timestamp) {
      const timestamp = new Date(result.timestamp).toLocaleString()
      const timestampEl = $(`
<div class="codio-assessment-last-run">LAST RUN&nbsp;
<span class="codio-assessment-last-run-time">on ${timestamp}</span>
</div>
`)
      resultInfoContainer.append(timestampEl)
    }
    resultInfoContainer.append(renderOutput())
    resultEl.append(resultInfoContainer)

    const resultActionsContainer = $('<div class="codio-assessment-result-actions-container"></div>')
    const expandButton = $(`
<button class="codio-assessment-result-actions-expand" title="Expand output">
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M10 21v-2H6.41l4.5-4.5l-1.41-1.41l-4.5 4.5V14H3v7zm4.5-10.09l4.5-4.5V10h2V3h-7v2h3.59l-4.5 4.5z"/></svg>
</button>
`)
    expandButton.attr('aria-label', `Expand output ${assessment.source.showName ? assessment.source.name : ''}`)
    expandButton.on('click', onExpandClick)
    resultActionsContainer.append(expandButton)
    resultEl.append(resultActionsContainer)
    resultBlock.append(resultEl)
  }

  const getAssessmentState = () => {
    const result = currentData ? currentData.result : null
    const answered = result?.state && result?.state !== window.codioAssessmentsHelper.States.RESET
    const usedAttempts = result?.usedAttempts || 0
    const canAnswerAgain = !assessment.source.maxAttemptsCount || usedAttempts < assessment.source.maxAttemptsCount
    const showModify = assessmentOptions.showUnblock && (!answered || canAnswerAgain)
    const isDisabled = processing ||
      assessmentOptions.isDisabled ||
      result?.state === window.codioAssessmentsHelper.States.PROGRESS ||
      answered && !canAnswerAgain
    const teacherInStudentsProject = assessmentOptions.showAsTeacher && !assessmentOptions.owner

    return {
      isDisabled,
      answered,
      usedAttempts,
      canAnswerAgain,
      showModify,
      teacherInStudentsProject
    }
  }

  const onToggleDiffView = () => {
    showAsDiff = !showAsDiff
    renderResult()
    updateFooterButtons()
  }

  const refreshResultAndFooter = () => {
    if (!assessment) {
      return
    }
    renderResult()
    updateFooterButtons()
  }

  const bindEvents = () => {
    $('.check-button').on('click', onCheck)
    $('.unblock-button').on('click', onUnblock)
    $('.reset-button').on('click', onReset)
    $('.diff-button').on('click', onToggleDiffView)

    window.codioAssessmentsHelper.addBodyHeightListener()
  }

  const render = () => {
    const container = $('.codio-assessment')
    const nameEl = container.find('.codio-assessment-name')
    assessment.source.showName ? nameEl.text(assessment.source.name) : nameEl.remove()
    renderContent()
    renderFooter()
    renderGuidance()
    refreshResultAndFooter()
    bindEvents()
    container.removeClass('hide')
  }

  const processMessage = (jsonData) => {
    try {
      const {method, data} = JSON.parse(jsonData)
      console.log('assessment iframe processMessage', jsonData, method, data)
      switch (method) {
        case window.codioAssessmentsHelper.METHODS.GET_STYLES_RESPONSE:
          window.codioAssessmentsHelper.addStyle(data.css)
          break
        case window.codioAssessmentsHelper.METHODS.GET_STATE_RESPONSE:
          updateProcessing(false)
          applyState(data)
          break
        case window.codioAssessmentsHelper.METHODS.CALLBACK: {
          window.codioAssessmentsHelper.processCallback(data)
          break
        }
      }
    } catch {}
  }

  window.addEventListener('load', () => {
    window.codioAssessmentsHelper.registerMessageListener(processMessage)
    window.codioAssessmentsHelper.send(window.codioAssessmentsHelper.METHODS.GET_STATE)
    window.codioAssessmentsHelper.send(window.codioAssessmentsHelper.METHODS.GET_STYLES)
  })
})()
