Date.prototype.addDays = function(days) {
    var date = new Date(this.valueOf());
    date.setDate(date.getDate() + days);
    return date;
}

function getAssetPerformance(dataArray){
    console.info('CakeAssetBuilder');
    // console.log(dataArray);

    // ältestes und neuestes Datum auslesen
    let oldestDatasetDate = dataArray.sort((a, b) => new Date(a['Date'].valueOf()) - new Date(b['Date'].valueOf()))[0]['Date'];
    let newestDatasetDate = dataArray.sort((a, b) => new Date(b['Date'].valueOf()) - new Date(a['Date'].valueOf()))[0]['Date'];

    // firstDate = Start des Datensets. -> ein Tag vor erstem Dataset-Eintrag...
    let firstDate = new Date(oldestDatasetDate);
    firstDate = firstDate.addDays(-1);
    firstDatasetDate = firstDate;   
    // console.log('firstDateEntry', firstDate);

    // 1. grupieren nach Currency
    let lmCurrencySet = new Set(dataArray.map(item => item['Coin/Asset']));
    // console.log(lmCurrencySet);
    dataArray = groupByArrayList(dataArray, Array.from(lmCurrencySet), 'Coin/Asset');
    // console.log('groupiert nach Coin/Asset', dataArray);

    
    // 2. gleiches Datum zusammen fassen
    lmCurrencySet.forEach(currency => dataArray[currency] = combindeSameDate(dataArray[currency]));
    // dataArray['DFI'] = combindeSameDate(dataArray['DFI']);
    // console.log('date combined', dataArray);


    // 3. "Buchhaltung": Beträge aufadieren, um Kontostand zu erhalten.
    let balances = {...dataArray};
    lmCurrencySet.forEach(currency => balances[currency] = buildBalance(balances[currency]));
    // console.log('build balance', balances);

    // 3a. erstes Datum für alle Datenreihen eintragen -> alle Grafen beginnen zum selben Zeitpunkt
    //      letztes Datum für alle Datenreihen eintrage -> alle Grafen enden zum selben Zeitpunkt
    let firstDataSet = {'date' : firstDate, 'balance' : 0};
    lmCurrencySet.forEach(currency => {dataArray[currency].unshift(firstDataSet); // erster Eintrag erstellen
                                        let lastElement = dataArray[currency].length - 1;
                                        dataArray[currency].push({'date' : newestDatasetDate, 'balance' : dataArray[currency][lastElement]['balance']});
                         });

    // 4. Diagramm zeichnen
    drawBalanceDiagrams(balances);
}

function combindeSameDate(inputArray){
  
    // Einträge des gleichen Datums kombinieren:
    // 1. Array auf notwendige Daten reduzieren:
    //    1.1. Datum: Uhrzeit löschen, so dass nur das Datum drin steht.
    //         Datum-Format ist immer: 2021-08-04T14:00:01+02:00 (Jahr, Monat, Tag, Uhrzeit, Zeitverschiebung)
    //    1.2. value entprechend dem valueProperty auswählen (entweder Amount oder FIAT value)
    let dateCombinedArray = [];
    // nur Date und FIAT value behalten... Date auf YYYY-MM-TT kürzen, Key-Values ohne Space

    dateCombinedArray = inputArray.map(item => ({'date' : item.Date.slice(0,10), 
                                                  'amount': parseFloat(item['Amount'])
                                                  }));
    
    // console.log(dateCombinedArray);
  
    // 2. Array kombinieren - gleiches Datum zusammenfassen...
    dateCombinedArray = Object.values(dateCombinedArray.reduce((item, {date, fiatValue, amount}) => {
                item[date] = (item[date] || {date, fiatValue : 0, amount : 0});
                item[date].amount = item[date].amount + amount;
              return item;
            }, {}));
    
    return dateCombinedArray;
  }

function buildBalance(inputArray){
    // array nach Datum sortieren: ältester Eintag zuerst
    inputArray = inputArray.sort((a, b) => new Date(a['date'].valueOf()) - new Date(b['date'].valueOf()));

    // kontostand (balance) bilden
    let balance = 0;
    inputArray.forEach(item => {
            item['balance'] = balance + parseFloat(item['amount']);
            balance = item['balance'];
                                                        });
    return inputArray;
    
}

function drawBalanceDiagrams(dataArray){
    // daten aufbereiten
    // console.log('drawBalanceDiagrams');
    // console.log(dataArray);
    let chartData = [];

    let keys = Object.keys(dataArray);
    // console.log('balanceKeys', keys);

    keys.forEach(key => {
                chartData[key] = dataArray[key].map(item => ({
                                    'x' : item.date,
                                    'y' : item.balance,
                                    }));    
         });
                                    
    // console.log('chartData', chartData);

    // chart data
    const balanceData = {};
    const balanceConfig = {};
    
    balanceChartIds = [];
    // 1. id des Paragraphen bekommen, wo die Charts darin erstellt werden
    let p = document.getElementById('balanceCharts');
    let balanceTable = document.getElementById('saldoTableBody');
    balanceTable.innerHTML = '';

    keys.forEach(key => {
            // chart data
            balanceData[key] = {
                datasets: [
                {
                    label: key,
                    data: chartData[key],
                    backgroundColor: 'rgba(84, 50, 170, 0.2)',
                    borderColor: 'rgba(84, 50, 170, 1)',
                    borderWidth: 2,
                    pointRadius: 0,
                    stepped: 'before',
                },
                ]
            };
            
            // chart config
            balanceConfig[key] = {
                type: 'line',
                data: balanceData[key],
                options: {
                  responsive: true,
                  plugins: {
                    title: {
                      text: key + ': Balance',
                      display: true
                    },
                    legend: {
                        display: false,
                      position: 'bottom',
                    },
                  },
                  interaction: {
                      axis: 'x',
                      intersect: false,
                      mode: 'index',
                  },
                  scales: {
                    x: {
                      type: 'time',
                      time: {
                        unit: 'day',
                        tooltipFormat: 'd. MMMM yyyy',
                      },
                      title: {
                        display: true,
                      },
                    //   min: '2020-01-31',
                      stacked: true,
                    },
                    y: {
                      beginAtZero: true,
                      title: {
                        display: true,
                      },
                      stacked: true,
                    }
                  },
                },
              };

            //--------------------------------------------
            //  Canvas für Chart generieren
            // -------------------------------------------
            // id des div generieren und div erstellen. Div wird gelöscht, falls es bereits existiert
            let divChartId = key + 'ChartDiv';
            let canvasChartId = key + 'ChartCanvas'
            let div = document.getElementById(divChartId);
            if (div !== null){
                p.removeChild(div);
            }
            div = document.createElement('div');
            let canvas = document.createElement('canvas');
            let divStyle = 'width:50%; height:50%';
            canvas.id = canvasChartId;
            canvas.width = '100';
            canvas.height = '40';
            div.id=divChartId;
            
            balanceChartIds.push(canvasChartId);


            div.setAttribute('style', divStyle);
            div.appendChild(canvas);
            p.appendChild(div);
            
            // chart zeichnen
            let myChartFiat = new Chart(canvas, balanceConfig[key]);

            // Zeile in Tabelle einfügen
            addBalanceTableRow(balanceTable, key, chartData[key][chartData[key].length-1]['y'].toFixed(8));
        });

}

function addBalanceTableRow(table, currency, balance){
 
    let row = '';
    row = `
        <tr>
            <td>${currency + ': '}</td>
            <td>${balance}</td>
            <td>comming soon</td>
        </tr>`;
        table.innerHTML += row;
}

function updateTimeRange(range){
    
    let startDate = new Date().addDays((-1)*range);
    // console.log(startDate);
    balanceChartIds.forEach(balanceChartId => {
        const chartToUpdate = Chart.getChart(balanceChartId);
        chartToUpdate.options.scales.x.min = startDate;
        chartToUpdate.update();
    });

}

function updateTimeRangeMax(){
    
    balanceChartIds.forEach(balanceChartId => {
        const chartToUpdate = Chart.getChart(balanceChartId);
        chartToUpdate.options.scales.x.min = firstDatasetDate;
        chartToUpdate.update();
    });
}
