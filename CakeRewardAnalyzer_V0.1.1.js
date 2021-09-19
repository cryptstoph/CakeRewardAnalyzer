// import {myTestData}
// console.log('hello analyzer');

let loadCsvButton = document.getElementById('loadCsv');
let csvFile = document.getElementById('csvFile');
csvFile.addEventListener('change', () => {
  console.log('csvFileChanged');
  Papa.parse(csvFile.files[0],{
    download: true,
    header: true,
    complete: function(results){
        processData(results);
    }
  })
});

loadCsvButton.addEventListener('click', () =>{
    
    drawGraphs();
})

// stacked / unstacked Bar Chart (Fiat chart)
let checkBoxStackedChart = document.getElementById('checkBoxStackedChart');
checkBoxStackedChart.addEventListener('change', function(){
  const myChart = Chart.getChart("rewardChart");
  if (this.checked){
    myChart.options.scales['x'].stacked = true;
    myChart.options.scales['y'].stacked = true;
  }else{
    myChart.options.scales['x'].stacked = false;
    myChart.options.scales['y'].stacked = false;
  }
  
  myChart.update();
});


function processData(rawData){
    rawDataArray = rawData.data;
    // console.log( JSON.stringify(rawDataArray));
    rewardArray = getRewardArray(rawDataArray);
    drawRewardTable(rewardArray);

}

function drawGraphs(){
  getInputData();
  
  let filterSelector = document.getElementById('currencySelector');
  let filter = filterSelector.value;
  // console.log('filter', filter);

  let rewardArrayFilteredDates = [];

  if (filter == 'all') {
    visualizeFiatRewards(rewardArray);
    getDonutChart(rewardArray);    
  } else {
    let rewardArrayfilteredByCoin = filterByCoin(rewardArray, filter);
    visualizeCoinRewards(rewardArrayfilteredByCoin, filter);
    getDonutChart(rewardArrayfilteredByCoin);    
  }

  getAssetPerformance(rawDataArray)
}

function filterByCoin(arrayToFilter, filter){
  // console.log('arrayToFilter', arrayToFilter);
 
  let filteredArray = arrayToFilter.filter(item => item['Coin/Asset'] == filter);
  // console.log('filteredArray', filteredArray);

  return filteredArray;
}

function getInputData(){
  showDailyRewards = document.getElementById('timeSelectionDaily').checked  ;
  // console.log('showDailyRewards',showDailyRewards);
}
function groupByArrayList(rawData, group, property){
    // -------------------------------------------------------------------
  // Daten Filtern nach den einzelnen Operation
  // gibt ein Objekt wo die einzelnen Operationen sortiert sind.
  let groupedArray = [] 

  for (let i = 0; i < group.length; i++){
    let tempArray = rawData.filter(item => item[property] == group[i]);
    // ignore empty Arrays
    if (tempArray.length != 0) {
      groupedArray[group[i]] = tempArray
    }
  }
  return groupedArray;
}

// ------------------------------------------------------------------
function addUpSameDay(inputArray, valueProperty){
  
  // Einträge des gleichen Datums kombinieren:
  // 1. Array auf notwendige Daten reduzieren:
  //    1.1. Datum: Uhrzeit löschen, so dass nur das Datum drin steht.
  //         Datum-Format ist immer: 2021-08-04T14:00:01+02:00 (Jahr, Monat, Tag, Uhrzeit, Zeitverschiebung)
  //    1.2. value entprechend dem valueProperty auswählen (entweder Amount oder FIAT value)
  let reducedFilteredArray = [];
  // nur Date und FIAT value behalten... Date auf YYYY-MM-TT kürzen, Key-Values ohne Space
  let dateCut = 10;
  if (!showDailyRewards){
    dateCut = 7;
  }
  reducedFilteredArray = inputArray.map(item => ({'date' : item.Date.slice(0,dateCut), 
                                                'value' : parseFloat(item[valueProperty]),
                                                  'coin' : item['Coin/Asset'],
                                                  'amount' : parseFloat(item['Amount']),
                                                }));
  
  // console.log('reducedFilteredArray', reducedFilteredArray);

  // 2. Array kombinieren - gleiches Datum zusammenfassen...
  reducedFilteredArray = Object.values(reducedFilteredArray.reduce((item, {date, value, coin, amount}) => {
              item[date] = (item[date] || {date, value : 0, coins : {}});
              item[date].coins[coin] = (item[date].coins[coin] || 0);
              item[date].value = item[date].value + value;
              item[date].coins[coin] += amount;
              // console.log(item);
            return item;
          }, {}));
  
  return reducedFilteredArray;
}

// donut chart aufbereiten
function getDonutChart(rewardsArray){
  
  // console.log('rewardsArray', rewardsArray);
  // -------------------------------------------------------------------
  // ---------------- CRYPTO CURRENCY ARRAY AUFBEREITEN ----------------
  // // alle vorhandenen Kryptowährungen raussuchen
  // let currencySet = new Set(rewardsArray.map(item => item['Coin/Asset']));
  // // console.log('currencySet', currencySet);
  // let currencies = Array.from(currencySet);
  // // console.log('currencies', currencies);
  
  
  // console.log('rewardsArray', rewardsArray);
  let dataArray = {};
  let liquidityMiningPattern = 'liquidity mining';
  let stakingPattern = 'staking';
  let freezerPattern = 'years freezer reward';
  let lendingPattern = 'lending';
  let productCategory = '';
  let donutData1 = []; // innerster Ring
  let donutData2 = []; // mittlerer Ring
  // let donutData3 = []; // äusserster Ring
  let donutLabels1 = []; // Labels für Chart
  let donutLabels2 = []; // Labels für Chart
  let colorPallette = [ ['#20124d', '#351c75', '#674ea7', '#8e7cc3', '#b4a7d6', '#d9d2e9', '#ead1dc', '#d5a6bd', '#c27ba0', '#a64d79', '#741b47', '#4c1130'],
                        ['#1c4587', '#1155cc', '#3c78d8', '#6d9eeb', '#a4c2f4', '#c9daf8', '#cfe2f3', '#9fc5e8', '#6fa8dc', '#3d85c6', '#0b5394', '#073763'],
                        ['#274e13', '#38761d', '#6aa84f', '#93c47d', '#b6d7a8', '#d9ead3', '#d0e0e3', '#a2c4c9', '#76a5af', '#45818e', '#134f5c', '#0c343d'],
                        ['#783f04', '#b45f06', '#e69138', '#f6b26b', '#f9cb9c', '#fce5cd', '#fff2cc', '#ffe599', '#ffd966', '#f1c232', '#bf9000', '#7f6000']];
                    
  donutColorPallette1 = [];
  donutColorPallette2 = [];
  // let donutLabels3 = []; // Labels für Chart
  // array auf die einzelnen Produktkategorien aufteilen
  productCategory = 'Liquidity Mining';
  dataArray[productCategory] = rewardsArray.filter(item => item['Operation'].toLowerCase().includes(liquidityMiningPattern));
  productCategory = 'Staking';
  dataArray[productCategory] = rewardsArray.filter(item => item['Operation'].toLowerCase().includes(stakingPattern) 
                                                          ||item['Operation'].toLowerCase().includes(freezerPattern));
  productCategory = 'Lending';
  dataArray[productCategory] = rewardsArray.filter(item => item['Operation'].toLowerCase().includes(lendingPattern));
  // in other kommt alles rein, was bisher noch nicht drin ist...
  productCategory = 'Other';
  dataArray[productCategory] = rewardsArray.filter(item => !(item['Operation'].toLowerCase().includes(liquidityMiningPattern) 
                                                    || item['Operation'].toLowerCase().includes(stakingPattern)  
                                                    || item['Operation'].toLowerCase().includes(lendingPattern)
                                                    ||item['Operation'].toLowerCase().includes(freezerPattern)));

  //  console.log('dataArray', dataArray);                                                  
  //  doughnutData.value = rewardsArray.reduce((acc, key) => parseFloat(key['FIAT value']) + acc , 0);
  
  // -------------------------------------------------------------------------------
  // --- Liquidity Mining ---
  // -------------------------------------------------------------------------------
  // Problem: ist nicht klar, welche Paare vorhanden sind... -> set erstellen mit den LM-Paaren
  productCategory = 'Liquidity Mining';
  let liquidityMiningSet = new Set(dataArray[productCategory].map(item => item['Operation']));       
  let liquidityMiningPairs = Array.from(liquidityMiningSet);
  // console.log('liquidityMiningSet', liquidityMiningSet);

  dataArray[productCategory] = groupByArrayList(dataArray[productCategory], liquidityMiningPairs, 'Operation');  

  // rename: remove 'Liquidity mining reward '
  liquidityMiningPairs.forEach(pair => {
    if (pair.includes('Liquidity mining reward')) {
      dataArray[productCategory][pair.slice('Liquidity mining reward '.length, pair.length)] = dataArray[productCategory][pair];
      delete dataArray[productCategory][pair];
    };
  })
  

  // für alle LiquidityMiningPairs sortieren!!!
  let keys = Object.keys(dataArray[productCategory]);
  // console.log('keys', keys);
  dataArray[productCategory].value = 0;
  for(let i = 0; i < keys.length; i++){
    let lmCurrencySet = new Set(dataArray[productCategory][keys[i]].map(item => item['Coin/Asset']));
    dataArray[productCategory][keys[i]] = groupByArrayList(dataArray[productCategory][keys[i]], Array.from(lmCurrencySet), 'Coin/Asset');
    
    dataArray[productCategory][keys[i]].value = 0;
    lmCurrencySet.forEach(currency => {
      dataArray[productCategory][keys[i]][currency].value = dataArray[productCategory][keys[i]][currency].reduce((acc, key) => parseFloat(key['FIAT value']) + acc , 0);
      dataArray[productCategory][keys[i]][currency].amount = dataArray[productCategory][keys[i]][currency].reduce((acc, key) => parseFloat(key['Amount']) + acc , 0);
      dataArray[productCategory][keys[i]].value += dataArray[productCategory][keys[i]][currency].value;

      // donutData3.push(dataArray[productCategory][keys[i]][currency].value);
      // donutLabels3.push(currency);

      dataArray[productCategory].value += dataArray[productCategory][keys[i]][currency].value;
    });
    donutData2.push(dataArray[productCategory][keys[i]].value);
    donutLabels2.push(keys[i]);
    donutColorPallette2.push(colorPallette[0][i+1]);
  }
  donutData1.push(dataArray[productCategory].value);
  donutLabels1.push(productCategory);
  donutColorPallette1.push(colorPallette[0][0]);
  // --- end Liquidity Mining

  // -------------------------------------------------------------------------------
  // --- Staking ---
  // -------------------------------------------------------------------------------
  productCategory = 'Staking';
  let stakingSet = new Set(dataArray[productCategory].map(item => item['Operation']));    
  let stakingPairs = Array.from(stakingSet);
  // console.log('stakingPairs', stakingPairs);

  dataArray[productCategory] = groupByArrayList(dataArray[productCategory], stakingPairs, 'Operation'); 
  // console.log('dataArray', dataArray);     

  // für alle Staking Pairs sortieren!!!
  keys = Object.keys(dataArray[productCategory]);
  // console.log('keys', keys);
  dataArray[productCategory].value = 0;
  for(let i = 0; i < keys.length; i++){
    let currencySet = new Set(dataArray[productCategory][keys[i]].map(item => item['Coin/Asset']));
    dataArray[productCategory][keys[i]] = groupByArrayList(dataArray[productCategory][keys[i]], Array.from(currencySet), 'Coin/Asset');
    
    dataArray[productCategory][keys[i]].value = 0;
    currencySet.forEach(currency => {
      dataArray[productCategory][keys[i]][currency].value = dataArray[productCategory][keys[i]][currency].reduce((acc, key) => parseFloat(key['FIAT value']) + acc , 0);
      dataArray[productCategory][keys[i]][currency].amount = dataArray[productCategory][keys[i]][currency].reduce((acc, key) => parseFloat(key['Amount']) + acc , 0);
      dataArray[productCategory][keys[i]].value += dataArray[productCategory][keys[i]][currency].value;

      // donutData3.push(dataArray[productCategory][keys[i]][currency].value);
      // donutLabels3.push(currency);

      dataArray[productCategory].value += dataArray[productCategory][keys[i]][currency].value;
    });
    donutData2.push(dataArray[productCategory][keys[i]].value);
    donutLabels2.push(keys[i]);
    donutColorPallette2.push(colorPallette[1][i+1]);
  }
  donutData1.push(dataArray[productCategory].value);
  donutLabels1.push(productCategory);
  donutColorPallette1.push(colorPallette[1][0]);
  // --- end Staking

  // -------------------------------------------------------------------------------
  // --- lending ---
  // -------------------------------------------------------------------------------
  // staking hat keine Unterkategorie...
  productCategory = 'Lending';
  currencySet = new Set(dataArray[productCategory].map(item => item['Coin/Asset']));
  // console.log('currencySet', currencySet);
  dataArray[productCategory] = groupByArrayList(dataArray[productCategory], Array.from(currencySet), 'Coin/Asset');
  dataArray[productCategory].value = 0;
  let tempIndex = 0;
  currencySet.forEach(currency => {
    dataArray[productCategory][currency].value = dataArray[productCategory][currency].reduce((acc, key) => parseFloat(key['FIAT value']) + acc , 0);
    dataArray[productCategory][currency].amount = dataArray[productCategory][currency].reduce((acc, key) => parseFloat(key['Amount']) + acc , 0);

    dataArray[productCategory].value += dataArray[productCategory][currency].value;
    // 2 & 3. Ebene sind identisch
    donutData2.push(dataArray[productCategory][currency].value);
    donutLabels2.push(currency);
    donutColorPallette2.push(colorPallette[2][tempIndex +1]);
    tempIndex += 1;
    // donutData3.push(dataArray[productCategory][currency].value);
    // donutLabels3.push(currency);
  });
  donutData1.push(dataArray[productCategory].value);
  donutLabels1.push(productCategory);
  donutColorPallette1.push(colorPallette[2][0]);
  // --- end lending

  // -------------------------------------------------------------------------------
  // --- other ---
  // -------------------------------------------------------------------------------
  productCategory = 'Other';
  let otherSet = new Set(dataArray[productCategory].map(item => item['Operation']));    
  let otherPairs = Array.from(otherSet);
  // console.log('otherPairs', otherPairs);

  dataArray[productCategory] = groupByArrayList(dataArray[productCategory], otherPairs, 'Operation'); 
  // console.log('dataArray', dataArray);     

  // für alle Staking Pairs sortieren!!!
  keys = Object.keys(dataArray[productCategory]);
  // console.log('keys', keys);
  dataArray[productCategory].value = 0;
  for(let i = 0; i < keys.length; i++){
    let currencySet = new Set(dataArray[productCategory][keys[i]].map(item => item['Coin/Asset']));
    dataArray[productCategory][keys[i]] = groupByArrayList(dataArray[productCategory][keys[i]], Array.from(currencySet), 'Coin/Asset');
  
    dataArray[productCategory][keys[i]].value = 0;
    currencySet.forEach(currency => {
      dataArray[productCategory][keys[i]][currency].value = dataArray[productCategory][keys[i]][currency].reduce((acc, key) => parseFloat(key['FIAT value']) + acc , 0);
      dataArray[productCategory][keys[i]][currency].amount = dataArray[productCategory][keys[i]][currency].reduce((acc, key) => parseFloat(key['Amount']) + acc , 0);
      dataArray[productCategory][keys[i]].value += dataArray[productCategory][keys[i]][currency].value;

      // donutData3.push(dataArray[productCategory][keys[i]][currency].value);
      // donutLabels3.push(currency);

      dataArray[productCategory].value += dataArray[productCategory][keys[i]][currency].value;
    });
    donutData2.push(dataArray[productCategory][keys[i]].value);
    donutLabels2.push(keys[i]);
    donutColorPallette2.push(colorPallette[3][i+1]);
  }
  donutData1.push(dataArray[productCategory].value);
  donutLabels1.push(productCategory);
  donutColorPallette1.push(colorPallette[3][0]);
  // --- end other

  // console.log('dataArray', dataArray);


  // Donut-Chart Daten aufbereiten... Problem ist, dass Labels und Daten nicht direkt verknüpft sind. 
  // Daher muss Datenset 2 & 3 der Wert 0 vorne eingefügt werden, damit die Daten dem Label entspricht. 
  let donutLabels = [];
  let donutDataFiat = [];
  donutLabels1.forEach(label => {
                                  donutLabels.push(label);
                                  donutData2.unshift(0.0);
                                  donutColorPallette2.unshift('');
                                  // donutData3.unshift(0.0);
                                });
  donutLabels2.forEach(label => {
                                  donutLabels.push(label);
                                  // donutData3.unshift(0.0);
                                });
  // donutLabels3.forEach(label => donutLabels.push(label));
  // donutData.push(donutData1, donutData2, donutData3);
  donutDataFiat.push(donutData1, donutData2);
  
  let donutDataPercent = [];
  // console.log(donutDataFiat);
  let sum1 = donutDataFiat[0].reduce((acc, item) => item += acc, 0);
  // donutDataPercent = [...donutData];
  donutDataPercent = donutDataFiat.map(item => item.map(value => value / sum1 * 100));

  drawDonutChart(donutLabels, donutDataPercent, donutDataFiat);

};

function generateDetailedTable(dataArray){
  // console.log(dataArray);

  // group by currency
  let currencySet = new Set(dataArray.map(item => item['Coin/Asset']));
  dataArray = groupByArrayList(dataArray, Array.from(currencySet), 'Coin/Asset'); 

  Object.keys(dataArray).forEach(item => {
                    let operations = new Set( dataArray[item].map(operation => operation['Operation']));
                    dataArray[item] = groupByArrayList(dataArray[item], Array.from(operations), 'Operation'); 
                    Object.keys(dataArray[item]).forEach(operation => {
                                  let amount = dataArray[item][operation].reduce((acc, key) => acc += parseFloat(key['Amount']), 0);
                                  let fiatValue = dataArray[item][operation].reduce((acc, key) => acc += parseFloat(key['FIAT value']), 0);
                                  dataArray[item][operation] = {'amount' : amount , 'fiatValue': fiatValue}
                                    // dataArray[item][operation] = dataArray[item][operation].reduce((acc, key) => acc.value += parseFloat(key['Amount']),{});
                                  });
                    
                    });
                                        
  // console.log('dataArray', dataArray);
}


function drawDonutChart(labels, dataPercent, dataFiat){
  
  dataFiat; 
  // index drehen...
  let fiatValueFixed = [];
  fiatValueFixed[0] = dataFiat[1];
  fiatValueFixed[1] = dataFiat[0];
  totalRewards = 0;
  dataFiat[0].forEach(item => totalRewards += item);

  // plugin, um Wert in der Mitte des Donut-Charts anzuzeigen:
  const counter = {
    id: 'counter',
    beforeDraw( chart, args, options){
      const {ctx, chartArea: {top, right, bottom, left, width, height }} = chart
      ;
      ctx.save();
      ctx.font = options.textSize + ' ' + 'sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(options.circleText, width/2, height / 2 + top);
      
    }
  };

  // console.log('dataFiat', dataFiat);
  // console.log(data[0]);
  let donutChartdata = {
          datasets: [{
            data: dataPercent[1],
            backgroundColor: donutColorPallette2,
            },
            {
            data: dataPercent[0],
            backgroundColor: donutColorPallette1,
            }
          ],
          labels: labels,
        };

  const donutChartConfig = {
            type: 'doughnut',
            data: donutChartdata,
            options: {
              
              responsive: true,
              plugins: {
                legend: {
                  display: true,
                  position: 'bottom',
                  onClick(){},
                  labels:{
                    generateLabels(){
                      
                    },
                  }
                },
                title: {
                  display: true,
                  text: 'Reward distribution'
                },
                tooltip: {
                  displayColors: true,
                  callbacks:{
                    title: function(title){
                      return title[0].label;
                    },
                    label: function(item) {
                      let tooltipText = ` ${item.formattedValue} %`;
                      return tooltipText;
                    },
                    afterLabel: function(item){
                      let fiatValue = fiatValueFixed[item.datasetIndex][item.dataIndex].toFixed(2);
                      return ` ${fiatValue} ${fiatCurrency}`;
                    },
                  }
                },
              counter: {
                textSize: '20px',
                circleText: totalRewards.toFixed(2) + ' ' + fiatCurrency,
              },    
            },
              
            },
            plugins: [counter]
          };

  if (donutChartExists){
    // destroy chart
    const myChart = Chart.getChart("donutChart");
    myChart.destroy();
  }

  let donutChart = document.getElementById('donutChart');
  let myDonutChart = new Chart(donutChart, donutChartConfig);
  donutChartExists = true;

}

function drawRewardTable(rewardsArray){
  // alle vorhandenen Kryptowährungen raussuchen
  let currencySet = new Set(rewardsArray.map(item => item['Coin/Asset']));
  // console.log('currencySet', currencySet);
  let currencies = Array.from(currencySet);
  // console.log('currencies', currencies);
  fillCurrencySelector(currencies);

  let sumOfAllCrypto = [];
  let myTable = document.getElementById('cryptoCurrencyTableBocy');
  let row = '';
  let htmlRewardText = document.getElementById('rewardsText');
  // Tabelle löschen
  let oldestDate = rewardsArray.sort((a, b) => new Date(a['Date'].valueOf()) - new Date(b['Date'].valueOf()))[0]['Date'];
  let newestDate = rewardsArray.sort((a, b) => new Date(b['Date'].valueOf()) - new Date(a['Date'].valueOf()))[0]['Date'];
 
 oldestDate = oldestDate.slice(0, 10);
 newestDate = newestDate.slice(0, 10);

 htmlRewardText.innerHTML = `Du hast im Zeitraum von ${oldestDate} bis ${newestDate} insgesamt folgende Rewards erhalten:`;
  myTable.innerHTML = '';
  for (let i = 0; i < currencies.length; i++){
    // Summe über die verschiedenen Assets bilden:
    sumOfAllCrypto[currencies[i]] = rewardsArray.filter(item => item['Coin/Asset'] == [currencies[i]]).reduce((acc, item) => acc + parseFloat(item['Amount']), 0);
    // Daten in Tabelle Schreiben
    row = `
          <tr>
            <td>${currencies[i] + ': '}</td>
            <td>${sumOfAllCrypto[currencies[i]]}</td>
          </tr>`;
    myTable.innerHTML += row;
  }

}

function fillCurrencySelector(currencies){

  let selector = document.getElementById('currencySelector');
  selector.innerHTML = `<option value="all">all rewards in FIAT</option>`;
  currencies.forEach(currency => {
    let option = document.createElement('option');
    option.value = currency;
    option.text = currency;
    selector.add(option);
  })
  
}
// ------------------------------------------------------------------
function getRewardArray(rawDataArray){

  // console.log((rawDataArray));

  // -------------------------------------------------------------------
  // ---------------------- INPUT-DATEN AUFBEREITEN --------------------
  // alle "Operation" heraus filtern
  let operationSet = new Set(rawDataArray.map(item => item['Operation']));
  // console.log(operationSet);
  // Array erzeugen
  let operations = Array.from(operationSet);
  console.log(operations);



  // -------------------------------------------------------------------
  // Nur noch Daten anschauen, die "reward" oder "bonus" in den Operation enthalten
  let rewardOperations = operations.filter(item => item.includes('reward') || item.includes('bonus') || item.includes('Airdrop'));
  // rawData filtern, dass nur noch Einträge enthalten sind, die als "operation" Werte haben, die im rewardOperation enthalten sind
  let rewardsArray = [...rawDataArray];
  rewardsArray = rewardsArray.filter(item => rewardOperations.includes(item.Operation));
  // console.log('rewardsArray', rewardsArray);
  return rewardsArray;
}

// function groupArrayByOperation(rewardsArray){
//     // Array nach Operation grupieren
//   // -------------------------------------------------------------------
//   let operationSet = new Set(rewardsArray.map(item => item['Operation']));
//   // console.log(operationSet);
//   // Array erzeugen
//   let operations = Array.from(operationSet);
//   // Nur noch Daten anschauen, die "reward" oder "bonus" in den Operation enthalten
//   let rewardOperations = operations.filter(item => item.includes('reward') || item.includes('bonus'));

//   let operationsGroupedArray = groupByArrayList(rewardsArray, rewardOperations, 'Operation');
//   // console.log('operationsGroupedArray', operationsGroupedArray);

//   return operationsGroupedArray;

// }

function visualizeFiatRewards(rewardsArray){  

  // Array nach Operation grupieren
  // -------------------------------------------------------------------
  let operationSet = new Set(rewardsArray.map(item => item['Operation']));
  // console.log(operationSet);
  // Array erzeugen
  let operations = Array.from(operationSet);
  // Nur noch Daten anschauen, die "reward" oder "bonus" in den Operation enthalten
  let rewardOperations = operations.filter(item => item.includes('reward') || item.includes('bonus') || item.includes('Airdrop'));

  let operationsGroupedArray = groupByArrayList(rewardsArray, rewardOperations, 'Operation');
  // console.log('operationsGroupedArray', operationsGroupedArray);



  // -------------------------------------------------------------------
  // ------------------ FIAT CURRENCY ARRAY AUFBEREITEN ----------------
  // FIAT currency heraus finden
  fiatCurrency = rewardsArray[0]['FIAT currency'];
  // alle Values addieren
  let fiatCurrencyGroupedArray = {...operationsGroupedArray};
  for (let i = 0; i < rewardOperations.length; i++){
    fiatCurrencyGroupedArray[rewardOperations[i]] = addUpSameDay(fiatCurrencyGroupedArray[rewardOperations[i]], 'FIAT value');
  }
  // console.log('fiatCurrencyGroupedArray', fiatCurrencyGroupedArray);
 

  // // todo crypto-currency daten hier aufbereiten!
  // getDonutChart(rewardsArray);

  // ------------------------------------------------------------------
  // Daten für Chart.js aufbereiten
  // benötigtes Format: data: [{x:'2016-12-25', y:20}, {x:'2016-12-26', y:10}]
  let fiatChartData = [];
  let fiatChartLabelInfo = [];
  for (let i = 0; i < rewardOperations.length; i++){
    fiatChartData[rewardOperations[i]] = fiatCurrencyGroupedArray[rewardOperations[i]].map(item => ({
                                                                                      'x' : item.date,
                                                                                      'y' : item.value,
                                                                                      }));
                                                                                 
  }
  // console.log('fiatChartLabelInfo', fiatChartLabelInfo);
  // console.log(chartData);

  // -----------------------------------------------------------------
  // Chart zeichnen
  let fiatChartDataset = {
      datasets: []};

  // console.log('fiatChartDataset', fiatChartDataset);
  for (i = 0; i < rewardOperations.length; i++){
    fiatChartDataset.datasets.push({
                        label: rewardOperations[i],
                        data: fiatChartData[rewardOperations[i]],
                        backgroundColor: colorSet[i],
                      });
  }

  let xScaleUnit = 'month';
  let actTooltipFormat = 'MMMM yyyy';
  if (showDailyRewards) {
    xScaleUnit = 'day';
    actTooltipFormat  = 'd. MMMM yyyy';
  }


  const fiatChartConfig = {
      type: 'bar',
      data: fiatChartDataset,
      options: {
        responsive: true,
        plugins: {
          title: {
            text: 'CakeDeFi Rewards',
            display: true
          },
          legend: {
            position: 'bottom',
          },
          tooltip:{
            itemSort: (a, b, data) => b.datasetIndex - a.datasetIndex, // sortieren, dass oberster Tooltip auch oberstem Balken entspricht
            callbacks:{

              label: function(item) {
                // console.log('item', item);

                // Object.keys(fiatCurrencyGroupedArray[item.dataset.label][item.dataIndex].coins).forEach(coin => console.log(coin));
                let cryptoValues = fiatCurrencyGroupedArray[item.dataset.label][item.dataIndex].coins;
                // console.log(cryptoValues);
                let keys = Object.keys(cryptoValues);
                let cryptoString = ' (';
                keys.forEach(key =>  {
                                      let value;
                                      if (cryptoValues[key] < 0.01){
                                        value = cryptoValues[key].toExponential(2);
                                        
                                      }else{
                                        value = cryptoValues[key].toFixed(2);
                                      }
                                      cryptoString += value + ' ' + key + ' + ';
                                      });

                //console.log(cryptoString.slice(0, cryptoString.length - 2) );
                cryptoString = cryptoString.slice(0, cryptoString.length - 3);
                return item.dataset.data[item.dataIndex].y.toFixed(2) + ' ' + fiatCurrency + ' ' + item.dataset.label + ' ' + cryptoString + ')';
              },
              footer: function(item) {
                // console.log('footerItem', item);
                let total = 0;
                item.forEach(x => total += x.parsed.y);

                return 'Total: ' + total.toFixed(2) + ' ' + fiatCurrency;
              },
            },
          },
        },
        interaction: {
          axis: 'x',
          intersect: false,
          mode: 'x',
        },
        scales: {
          x: {
            type: 'time',
            time: {
              unit: xScaleUnit,
              // Luxon format string
              tooltipFormat: actTooltipFormat,
            },
            title: {
              display: true,
              text: 'Date'
            },
            stacked: checkBoxStackedChart.checked,
          },
          y: {
            title: {
              display: true,
              text: fiatCurrency,
            },
            stacked: checkBoxStackedChart.checked,
          }
        },
      },
    };

    drawFiatChart(fiatChartConfig);

}

function visualizeCoinRewards(rewardsArray, coin){
// Array nach Operation grupieren
  // -------------------------------------------------------------------
  let operationSet = new Set(rewardsArray.map(item => item['Operation']));
  // console.log(operationSet);
  // Array erzeugen
  let operations = Array.from(operationSet);
  // Nur noch Daten anschauen, die "reward" oder "bonus" in den Operation enthalten
  let rewardOperations = operations.filter(item => item.includes('reward') || item.includes('bonus') || item.includes('Airdrop') );

  let operationsGroupedArray = groupByArrayList(rewardsArray, rewardOperations, 'Operation');
  // console.log('operationsGroupedArray', operationsGroupedArray);


  let cryptoCurrencyGroupedArray = {...operationsGroupedArray};
  for (let i = 0; i < rewardOperations.length; i++){
    cryptoCurrencyGroupedArray[rewardOperations[i]] = addUpSameDay(cryptoCurrencyGroupedArray[rewardOperations[i]], 'Amount');
  }
  console.log('cryptoCurrencyGroupedArray', cryptoCurrencyGroupedArray);
 

  // ------------------------------------------------------------------
  // Daten für Chart.js aufbereiten
  // benötigtes Format: data: [{x:'2016-12-25', y:20}, {x:'2016-12-26', y:10}]
  let cryptoChartData = [];
  for (let i = 0; i < rewardOperations.length; i++){
    cryptoChartData[rewardOperations[i]] = cryptoCurrencyGroupedArray[rewardOperations[i]].map(item => ({
                                                                                      'x' : item.date,
                                                                                      'y' : item.value,
                                                                                      }));
                                                                                 
  }
  // -----------------------------------------------------------------
  // Chart zeichnen
  let cryptoChartDataset = {
      datasets: []};

  // console.log('fiatChartDataset', fiatChartDataset);
  for (i = 0; i < rewardOperations.length; i++){
    cryptoChartDataset.datasets.push({
                        label: rewardOperations[i],
                        data: cryptoChartData[rewardOperations[i]],
                        backgroundColor: colorSet[i],
                      });
  }

  let xScaleUnit = 'month';
  let actTooltipFormat = 'MMMM yyyy';
  if (showDailyRewards) {
    xScaleUnit = 'day';
    actTooltipFormat  = 'd. MMMM yyyy';
  }

  const fiatChartConfig = {
      type: 'bar',
      data: cryptoChartDataset,
      options: {
        responsive: true,
        plugins: {
          title: {
            text: 'CakeDeFi: ' + coin + ' Rewards',
            display: true
          },
          legend: {
            position: 'bottom',
          },
          tooltip:{
            itemSort: (a, b, data) => b.datasetIndex - a.datasetIndex, // sortieren, dass oberster Tooltip auch oberstem Balken entspricht
            callbacks:{

              label: function(item) {
                // console.log('item', item);
                let value = item.raw.y;
                if (value < 0.01){
                  value = value.toExponential(2);
                }else{
                  value = value.toFixed(2);
                }
                return value +' ' + coin + ' ' + item.dataset.label;
              },

              footer: function(item) {
                // console.log('footerItem', item);
                let total = 0;
                item.forEach(x => total += x.parsed.y);

                if (total < 0.01){
                  totalValue = total.toExponential(2);
                  
                }else{
                  totalValue = total.toFixed(2);
                }
                return 'Total: ' + totalValue + ' ' + coin;
              },
            },
          },
        },
        interaction: {
          axis: 'x',
          intersect: false,
          mode: 'x',
        },
        scales: {
          x: {
            type: 'time',
            time: {
              unit: xScaleUnit,
              // Luxon format string
              tooltipFormat: actTooltipFormat,
            },
            title: {
              display: true,
              text: 'Date'
            },
            stacked: checkBoxStackedChart.checked,
          },
          y: {
            title: {
              display: true,
              text: coin,
            },
            stacked: checkBoxStackedChart.checked,
          }
        },
      },
    };

    drawFiatChart(fiatChartConfig);
}

function drawFiatChart(chartData){

  if (fiatChartExists){
    // destroy chart
    const myChart = Chart.getChart("rewardChart");
    myChart.destroy();
  }

  let ctxFiat = document.getElementById('rewardChart');
  let myRewardChart = new Chart(ctxFiat, chartData);
  fiatChartExists = true;

}

// WIP
function getDatesInRange(dataArray){
  // selection full, 30 days, this month, last month
  // console.log('dataArray', dataArray);
  let today = new Date();
  let last30Days = new Date();
  last30Days.setDate(today.getDate()- 30);
  let lastMonth = new Date();
  lastMonth = (today.getMonth() - 1);
  // console.log('lastMonth', lastMonth);
  let selection;
 
  // todo: Selection!!!
  selection = 0;
  switch (selection) {
    case 0: // all
      break;
    case 1: //'thisMonth':
      dataArray = dataArray.filter(item => new Date(item['Date']).getMonth() == today.getMonth());
      break;
    case 2: //'lastMonth':
      dataArray = dataArray.filter(item => new Date(item['Date']).getMonth() == (today.getMonth() - 1));
      break;
    case 3: //'last30Days':
      dataArray = dataArray.filter(item => new Date(item['Date']) > last30Days);
      break;
  }                     

  // console.log('dataArray', dataArray);
  //  dataArray = dataArray.filter(item => item['Date']);

  return dataArray
}

let donutColorPallette1 = [];
let donutColorPallette2 = [];
const colorSet = ['#142459', '#176BA0', '#19AADE', '#AF4BCE', '#DB4CB2', '#EA7369', '#EABD3B', '#E7E34E',
                  '#142459', '#176BA0', '#19AADE', '#1BD4D4', '#AF4BCE', '#DB4CB2', '#EA7369', '#EABD3B', '#E7E34E',
                  '#142459', '#176BA0', '#19AADE', '#1BD4D4', '#AF4BCE', '#DB4CB2', '#EA7369', '#EABD3B', '#E7E34E'];

let fiatChartExists = false;
let donutChartExists = false;
let showDailyRewards = true;
let fiatCurrency;
let balanceChartIds = [];
let firstDatasetDate;
let rawDataArray = [];
let rewardArray = [];
let dataFilteredByDate = getDatesInRange(myTestData2);
let tempRewardArray = getRewardArray(dataFilteredByDate);
// visualizeRewards(tempRewardArray);
// getDonutChart(tempRewardArray);
// generateDetailedTable(tempRewardArray);
// getAssetPerformance(myTestData2);
