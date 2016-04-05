var scan = function() {

  var req = navigator.mozWifiManager.getNetworks();
  
  req.onsuccess = function( data ){
    (document.querySelector('.status') || {}).textContent = 'Escaneamento Finalizado';
    
    var results = req.result;
    
    for (i=0;i<results.length;++i) {
      var result = results[i];
      var index = {};
      index.ssid = result.ssid;
      index.bssid = result.bssid;
      index.security = result.security.join(', ');
      index.frequency = result.frequency;
      index.capabilities = result.capabilities.join(', ');
      index.sinalStrength = result.sinalStrength;
      index.relSignalStrength = result.relSignalStrength;

      if (window.bssid.indexOf(index.bssid) != -1) {
      
        //console.log('Wifi achado' + index.ssid);
      
      } else {
      
        content = [];
        content.push(index.ssid, index.bssid, index.security, index.frequency, index.capabilities, index.sinalStrength, index.relSignalStrength);
        
        window.bssid.push(index.bssid);
            
        //(document.querySelector('#counter') || {}).textContent = window.bssid.length;
          
        navigator.mozOs.appendFile('/storage/sdcard/wifidata.csv', "\n" + content.join(";"), 'utf-8')
          .catch(err => console.error('Append failed', err));
          
      }
      
      (document.querySelector('#counter') || {}).textContent = window.bssid.length;
      
    }
    window.updateChart(results.length);
    
  }
  
  req.onerror = function(){
    (document.querySelector('.status') || {}).textContent = 'Erro ao procurar redes';
    console.log('Não foi possível scanear');
    console.log(req.error);
  }
  
}

window.uptime = 0;

window.addEventListener('ready', ev => {

  var lock = navigator.mozSettings.createLock();
  var status = false;
  var result = lock.set({
    'wifi.enabled': true
  });
  
  result.onerror = function () {
    console.log("Não foi possível mudar o status do wifi: " + req.error);
  }
  
  status = navigator.mozWifiManager.enabled;
  
  console.log('Wifi: ' + status);
  
  if (status) {
    (document.querySelector('.status') || {}).textContent = 'Wifi Habilitado';
  } else {
    (document.querySelector('.status') || {}).textContent = 'Wifi Desabilitado';
  }
  
  var battery = navigator.battery || navigator.mozBattery || navigator.webkitBattery;
  
  function updateBatteryStatus() {
    document.getElementById('battery').innerHTML = battery.level * 100 + "%";
  }

  battery.addEventListener("levelchange", updateBatteryStatus);
  updateBatteryStatus();

  window.dps = [];
  window.xVal = 0;

  window.chart = new CanvasJS.Chart("graph", {
    theme:"theme2",
    dataPointWidth: 40,
    backgroundColor: "transparent",
    width: screen.width - 10,
    toolTip: {
      enabled: false
    },
    interactivityEnabled: false,
    axisX: {
     	labelFontColor: "transparent",
     	tickColor: "transparent"
    },
    animationEnabled: true,
    axisY :{
      includeZero: false,
    },
    data: [{
      type: "line",
      dataPoints: window.dps
    }]
  });

  while (window.dps.length < 40) {
    window.dps.push({
      y: 0,
      x: window.xVal
    });
    window.xVal++;
  }
  
  window.chart.render();
  
  window.updateChart = function (yv) {
    window.dps.push({
      y: yv,
      x: window.xVal
    });
    
    ++xVal;
    
    if (window.dps.length > 40){
      window.dps.shift();
    }
    window.chart.render();
  }
  
  window.bssid = [];
  
  navigator.mozOs.readFile('/storage/sdcard/wifidata.csv', 'utf-8')
    .then(function(content){
      
      var lines = content.split("\n").slice(1);
      for (i=0;i<lines.length;++i){
        window.bssid.push(lines[i].split(";")[1]);
      }
      
    }).catch(function(err){
      if (err.unixErrno == 2) {
          
        navigator.mozOs.appendFile('/storage/sdcard/wifidata.csv', 'SSID;BSSID;Security;Frequency;Capabilities;Sinal Strength;Rel Signal Strength', 'utf-8')
          .catch(err => console.error('Append failed', err));
          
      } else {
        console.error('readFile', err);
      }
    });
    
  window.setInterval(function(){
  
    ++window.uptime;
    var horas = Math.floor(window.uptime / 3600);
    var minutos = window.uptime - (3600 * horas);
    var segundos = window.uptime - (3600 * horas);
    
    minutos = Math.floor(minutos / 60);
    segundos = segundos - (minutos * 60);
    
    if (horas.toString().length < 2) {
      horas = "0" + horas.toString();
    }
    
    if (minutos.toString().length < 2) {
      minutos = "0" + minutos.toString();
    }
    
    if (segundos.toString().length < 2) {
      segundos = "0" + segundos.toString();
    }
    
    document.getElementById('time').innerHTML = horas + ":" + minutos + ":" + segundos;
  
  }, 1000);

  (document.querySelector('#counter') || {}).textContent = window.bssid.length;

  window.setInterval(function(){
    if (status) {
      scan();
    }
  }, 1000);
  
  window.onkeypress=function(e){
  
    if (e.key == "Power") {
      navigator.mozPower.screenEnabled = (navigator.mozPower.screenEnabled == false);
    } else if ((e.key == "VolumeUp") && (navigator.mozPower.screenBrightness < 1)) {
      navigator.mozPower.screenBrightness = navigator.mozPower.screenBrightness + 0.1;
    } else if ((e.key == "VolumeDown") && (navigator.mozPower.screenBrightness > 0.1)) {
      navigator.mozPower.screenBrightness = navigator.mozPower.screenBrightness - 0.1;
    }
  
  };
  
});
