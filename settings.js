(function () {
  const collectSettings = () => {
    const instructions = $('#instructions').val()
    const command = $('#command').val();
    const preExecuteCommand = $('#preExecCommand').val();
    const timeout = parseInt($('#timeout').val(), 10);

    return {instructions, command, preExecuteCommand, timeout};
  }

  const exportSettings = () => {
    const data = collectSettings();
    window.codioAssessmentsHelper.send(window.codioAssessmentsHelper.METHODS.EXPORT_SETTINGS_RESPONSE, data);
  }

  const applySettings = (settings = {}) => {
    $('#instructions').val(settings.instructions || '');
    $('#command').val(settings.command || '');
    $('#preExecCommand').val(settings.preExecuteCommand || '');
    $('#timeout').val(settings.timeout || '');
  }

  const processMessage = (jsonData) => {
    console.log('settings iframe processMessage', jsonData)
    try {
      const {method, data} = JSON.parse(jsonData);
      switch (method) {
        case window.codioAssessmentsHelper.METHODS.EXPORT_SETTINGS:
          exportSettings();
          break;
        case window.codioAssessmentsHelper.METHODS.GET_SETTINGS_RESPONSE:
          applySettings(data.settings);
          break;
      }
    } catch {}
  }

  const onLoad = async () => {
    window.codioAssessmentsHelper.registerMessageListener(processMessage)
    window.codioAssessmentsHelper.send(window.codioAssessmentsHelper.METHODS.GET_SETTINGS)
  }

  window.addEventListener('load', onLoad);
})()
