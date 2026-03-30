(function (){
  let assessmentOptions = null
  let assessment = null
  let processing = false
  let showAsDiff = false
  let currentData = null

  const updateProcessing = (status) => {
    processing = status
    updateHtml()
  }

  const applyStateInitial = (data) => {
    const {state, result, ...dataWithoutState} = data
    assessment = dataWithoutState.assessment
    assessmentOptions = dataWithoutState.options

    render()
  }

  const applyState = (data) => {
    console.log('assessment iframe applyState', data)
    currentData = data
    if (!assessment) {
      applyStateInitial(data)
      return
    }
    if (data.state) {
      updateHtml()
      renderGuidance()
      return
    }
    // reset
    if (currentData.state && !data.state) {
      updateHtml()
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
    // todo
  }

  const updateFooterButtons = () => {
    const assessmentState = getAssessmentState()
    const {teacherInStudentsProject, showModify, isDisabled, canAnswerAgain, passed, answered} = assessmentState

    const checkVisibility = !showModify && assessmentOptions.useSubmitButtons
    const checkBtn = $('.check-button')
    updateVisibility(checkBtn, checkVisibility)
    $('.check-button').attr('disabled', isDisabled)

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

  const renderResult = () => {
    // todo render result
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

  const updateHtml = () => {
    if (!assessment) {
      return
    }
    // processing, new state/results
    const assessmentState = getAssessmentState()
    $('.check-button').attr('disabled', assessmentState.isDisabled)
    const blockActionsEl = $('.block-actions')
    assessmentState.isDisabled ? blockActionsEl.removeClass('hide') : blockActionsEl.addClass('hide')

    updateFooterButtons()
  }

  const bindEvents = () => {
    $('.check-button').on('click', onCheck)
    $('.unblock-button').on('click', onUnblock)
    $('.reset-button').on('click', onReset)

    window.codioAssessmentsHelper.addBodyHeightListener()
  }

  const render = () => {
    const container = $('.codio-assessment')
    const nameEl = container.find('.codio-assessment-name')
    assessment.source.showName ? nameEl.text(assessment.source.name) : nameEl.remove()
    renderContent()
    renderFooter()
    renderGuidance()
    renderResult()
    updateHtml()
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
