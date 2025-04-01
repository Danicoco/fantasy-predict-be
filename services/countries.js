
const axios = require('axios')


const getAllCountries = async (req, res) => {
	try {
		const {data} = await axios.get(process.env.COUNTRY_URL)
        
        const countries = data.map(country => {
            return {
              name: country.name.common,
              code: `${country.idd.root}${country.idd.suffixes}`,
              flag: country.flags.png,
            };
          });
     return res.status(200).json({
        status: "success",
        data: countries
     })    
		
	} catch (error) {
        console.log(error)
      res.status(500).json({
            status: "error",
           message: "something went wrong"
         })  
		 
	}
}



exports.getAllCountries = getAllCountries;

