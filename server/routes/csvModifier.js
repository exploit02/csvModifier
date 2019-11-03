var express = require('express');
var router = express.Router();
var multiparty = require('multiparty'); // Used for parsing http requests with content-type multipart/form-data
var path = require('path');
var fs = require('fs');
var fastCSV = require('fast-csv'); // Used for parsing CSV File

router.post('/', (req, res, next) => {
    
    var form = new multiparty.Form(); 
    form.parse(req, (err, fields, files) => {
        
        if(files === undefined || ! Object.keys(files).includes('csv')){
            /* 
             * If user is not sending any file or key is not csv
             */
            res.status(400).json({Message: 'Make sure you are sending one file with key: csv', Success: false});
            res.end();
            return ;
        }

        var filepath = files.csv[0].path; // Extracting file path

        /*
         * Preparing to be removed column names array.
         * If request doesn't contain remove field then to be removed column names array will be empty
         * Otherwise spliting using ',' as well as trimming.
         */
        var removeColumnArray =  fields.remove ? fields.remove[0].split(',').map( slice => slice.trim() ) : [] ; 

        if(path.extname(filepath) !== '.csv'){
            /*
             * If user is sending any other type file instead of CSV
             */
            res.status(422).json({Message: 'Invalid File Type', Success: false});
            res.end();
            return ;
        }
       
        var data = [] ;
        var readStream = fs.createReadStream(filepath) ;
        
        readStream.on('error', (err)=>{
            console.log(err) ;
            res.status(500).json({Message: 'Something went wrong', Success: false}) ;
            res.end() ;
            return ;
        });

        readStream
            .pipe(fastCSV.parse({ headers: true , trim: true}))
            .on('error', (err)=>{
                /*
                 * CSV Parsing error
                 */
                res.status(422).json({Message: 'CSV File parsing error', Success: false}) ;
                res.end() ;
                return ;
            })
            .on('data', (row) => {
                /*
                 * Parsing CSV file and removing column based on column specified in request remove field
                 */
                removeColumnArray.forEach(key => delete row[key]) ;
                data.push(row) ;
            })
            .on('end', () => {
                /*
                 * CSV parsing completed
                 * Will convert CSV object format data to comma separated string format and send it as response 
                 */
                res.writeHead(200, {'Content-Type': 'text/csv'}) ;
                res.write(objectToCSV(data)) ;
                res.end() ;
            })
    });

});


/*
 * Function to Convert Object Format CSV Data to Comma Separated String Format
 * @param {object} parsedCsvData  Expect parsed CSV data with header
 */
function objectToCSV(parsedCsvData) {
    if(parsedCsvData.length === 0){
        // If blank CSV sheet then return '' string
        return '' ;
    }
    const csvInObjFormat = typeof parsedCsvData !== 'object' ? JSON.parse(parsedCsvData) : parsedCsvData ;
    let objToCsvFormat = `${Object.keys(csvInObjFormat[0]).map(slice => `"${slice}"`).join(",")}` + '\r\n' ; // Preparing CSV column header

    return csvInObjFormat.reduce((objToCsvFormat, next) => {
        // Preparing comma separated string format CSV data
        objToCsvFormat += `${Object.values(next).map(slice => `"${slice}"`).join(",")}` + '\r\n' ;
        return objToCsvFormat ;
    },  objToCsvFormat)
}

module.exports = router;
