(function (PV) {
	"use strict";

	function symbolVis() { };
	PV.deriveVisualizationFromBase(symbolVis);

	var definition = { 
		typeName: "tabledata",
		displayName: 'PIML Table',
		iconUrl: 'Scripts/app/editor/symbols/ext/images/picnic-table-white.png',
		visObjectType: symbolVis,
		datasourceBehavior: PV.Extensibility.Enums.DatasourceBehaviors.Multiple,
		getDefaultConfig: function(){ 
			return { 
				DataShape: 'Timeseries',
				Height: 150,
				Width: 150, 
				HeaderColor: "blue",
				showElementNames: false,
				Asset: "",//Current Asset path
				RebuildAttributes: false,
				ExcludedAttributes: []
			} 
		},
		configOptions: function(){
			return[
				{
					title: "Format Symbol",
					mode: "format"
					
				}
			];
		}
	}
	
	
	symbolVis.prototype.init = function(scope, elem) { 
		this.onDataUpdate = dataUpdate;

		function dataUpdate(data){
			if(!data) return;
			var Attributes = data.Data;
			var Labels=[];
			var Times=[];
			var j,t,w,x;
			var thedata=[];
			var col=0;
			var currentasset="";
			var pipeindex =scope.symbol.DataSources[0].lastIndexOf('|');

			currentasset=scope.symbol.DataSources[0].slice(3,pipeindex);//get the asset path from the datasource
			

			if (scope.config.Asset == "" ){
				scope.config.Asset=currentasset;
			}
			//Rebuild all attributes for new asset
			if (scope.config.Asset != currentasset && scope.config.RebuildAttributes){
				scope.config.Asset = currentasset;

				//webAPI call for new asset element
				var theURL="https://yourpiwebapiserver/piwebapi/elements?path="+scope.config.Asset;
				//console.log("theURL:" + theURL)
				$.ajax({
					url: theURL,
					type: "GET",
					xhrFields: {
						withCredentials: true
					},
					//crossDomain: true,
					success: SuccessFunc
				});
		
			}


			for (j=0;j<Attributes.length;j++){
				thedata.push([]); //create blank column array
				for (w=0;w<Attributes[j].Values.length;w++){
					if (Times.length==0){
						//no times added yet, add first one
						Times.push(Attributes[j].Values[w].Time)
					}
					for (t=0;t<Times.length;t++){//loop through all of times find the correct column for the value
						if (Date.parse(Attributes[j].Values[w].Time)==Date.parse(Times[t])){
							col=t; //use this column
							break;
						}else if (Date.parse(Attributes[j].Values[w].Time) < Date.parse(Times[t])){
							//need to insert a Time column
							Times.splice(t,0,Attributes[j].Values[w].Time); //add time column to the Times array
							
							//need to splice all of the existing columns in thedata array
							for (x=0;x<thedata.length;x++){
								if (thedata[x].length - 1 >= t){//only need to splice if there are columns past the new one
									thedata[x].splice(t,0,"");
								}
							}
							col=t;
							break;
						}else if (t==Times.length-1){
							//Add new time column to end
							Times.push(Attributes[j].Values[w].Time);
							//should loop around and hit the first if statement next time
						}
					}
					
					thedata[j][col]=Attributes[j].Values[w].Value;//put the value in the correct column
				}
			}
			
			scope.Data = thedata;//pass the data to the scope
			scope.Times = Times; //pass the Times array to the scope
			scope.SymbolName=data.SymbolName;



			//sporadic update data
			if(Attributes[0].Label){
				pipeindex = -1;
				var Attribute ="";
				scope.theelement="Attributes";
				//Put all of the labels into an array
				for (j=0;j<Attributes.length;j++){
					pipeindex = Attributes[j].Label.lastIndexOf("|");
					
					if(pipeindex >0){//if a pipe exists then it is an AF attribute
						if (scope.config.showElementNames){
							Labels.push(Attributes[j].Label)
						} else {
							//separate the Attribute name from the Element name
							Attribute = Attributes[j].Label.slice(pipeindex+1,Attributes[j].Label.length);
							Labels.push(Attribute);
						}
						if(j==0){
							//get the Element name
							if (!scope.config.showElementNames){
								scope.theelement=Attributes[j].Label.slice(0,pipeindex) + " Attributes";
							}
							//Get the Parent from the Path
							scope.Parent=Attributes[j].Path.slice(0,Attributes[j].Path.length-Attributes[j].Label.length);
						}
					}else {
						Labels.push(Attributes[j].Label);
					}
				}
				scope.Labels = Labels; //pass the labels to the scope
			}
		}
		function SuccessFunc(response) {
			//webAPI call for elments of new asset

			$.ajax({
				url: response.Links.Attributes,
				type: "GET",
				xhrFields: {
					withCredentials: true
				},
				//crossDomain: true,
				success: Build
			});
		}
		function Build(response){
			scope.symbol.DataSources=[];//Clear the existing DataSources
			//put the new paths in DataSources
			for (var j=0;j<response.Items.length;j++){
				var thepath=response.Items[j].Path;
				if(!scope.config.ExcludedAttributes.includes(response.Items[j].Name)){//Don't add if the Name of the Attribute is in the Excluded list
					scope.symbol.DataSources.push("af:"+thepath);//add
				}
			}
			
		}
		scope.runtimeData.addAttr = function(){
			if (scope.runtimeData.input){//make sure it is defined
				scope.runtimeData.input.trim();
				//Add input if it has characters and it isn't already in the list
				if(scope.runtimeData.input.length>0 && !scope.config.ExcludedAttributes.includes(scope.runtimeData.input)){
					console.log('adding '+scope.runtimeData.input);
					scope.config.ExcludedAttributes.push(scope.runtimeData.input);
				}
				scope.runtimeData.input="";
			}
		}
		scope.runtimeData.removeAttr = function(){
			var index =scope.runtimeData.selectedStream;

			scope.config.ExcludedAttributes.splice(index,1);
		}
	};
	
	

	PV.symbolCatalog.register(definition); 

})(window.PIVisualization); 
