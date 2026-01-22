// Approximate fuel prices for major Indian cities (as of 2024)
// Prices in INR

export interface CityFuelPrices {
  petrol: number;
  diesel: number;
  cng: number;
  electric: number;
}

export interface CityData {
  name: string;
  state: string;
  prices: CityFuelPrices;
}

// Major cities with approximate fuel prices
export const cityFuelPrices: Record<string, CityData> = {
  // Metro Cities
  "delhi": {
    name: "Delhi",
    state: "Delhi",
    prices: { petrol: 94.72, diesel: 87.62, cng: 74.09, electric: 8 }
  },
  "mumbai": {
    name: "Mumbai",
    state: "Maharashtra",
    prices: { petrol: 104.21, diesel: 92.15, cng: 75.00, electric: 8.5 }
  },
  "kolkata": {
    name: "Kolkata",
    state: "West Bengal",
    prices: { petrol: 104.95, diesel: 91.76, cng: 76.00, electric: 7.5 }
  },
  "chennai": {
    name: "Chennai",
    state: "Tamil Nadu",
    prices: { petrol: 102.63, diesel: 94.24, cng: 78.00, electric: 7.8 }
  },
  "bangalore": {
    name: "Bangalore",
    state: "Karnataka",
    prices: { petrol: 101.94, diesel: 87.89, cng: 77.00, electric: 8.2 }
  },
  "bengaluru": {
    name: "Bengaluru",
    state: "Karnataka",
    prices: { petrol: 101.94, diesel: 87.89, cng: 77.00, electric: 8.2 }
  },
  "hyderabad": {
    name: "Hyderabad",
    state: "Telangana",
    prices: { petrol: 107.41, diesel: 97.80, cng: 76.50, electric: 8.0 }
  },
  
  // State Capitals & Major Cities
  "ahmedabad": {
    name: "Ahmedabad",
    state: "Gujarat",
    prices: { petrol: 94.55, diesel: 90.32, cng: 72.00, electric: 7.5 }
  },
  "pune": {
    name: "Pune",
    state: "Maharashtra",
    prices: { petrol: 104.44, diesel: 91.56, cng: 74.00, electric: 8.2 }
  },
  "jaipur": {
    name: "Jaipur",
    state: "Rajasthan",
    prices: { petrol: 104.88, diesel: 90.34, cng: 79.00, electric: 7.8 }
  },
  "lucknow": {
    name: "Lucknow",
    state: "Uttar Pradesh",
    prices: { petrol: 94.63, diesel: 87.65, cng: 73.00, electric: 7.5 }
  },
  "kanpur": {
    name: "Kanpur",
    state: "Uttar Pradesh",
    prices: { petrol: 94.63, diesel: 87.65, cng: 73.50, electric: 7.5 }
  },
  "nagpur": {
    name: "Nagpur",
    state: "Maharashtra",
    prices: { petrol: 104.51, diesel: 91.46, cng: 75.00, electric: 8.0 }
  },
  "indore": {
    name: "Indore",
    state: "Madhya Pradesh",
    prices: { petrol: 107.68, diesel: 93.41, cng: 80.00, electric: 7.8 }
  },
  "bhopal": {
    name: "Bhopal",
    state: "Madhya Pradesh",
    prices: { petrol: 108.65, diesel: 93.90, cng: 79.00, electric: 7.8 }
  },
  "patna": {
    name: "Patna",
    state: "Bihar",
    prices: { petrol: 107.24, diesel: 94.04, cng: 82.00, electric: 7.5 }
  },
  "vadodara": {
    name: "Vadodara",
    state: "Gujarat",
    prices: { petrol: 94.38, diesel: 90.19, cng: 72.50, electric: 7.5 }
  },
  "surat": {
    name: "Surat",
    state: "Gujarat",
    prices: { petrol: 94.59, diesel: 90.36, cng: 72.00, electric: 7.5 }
  },
  "chandigarh": {
    name: "Chandigarh",
    state: "Chandigarh",
    prices: { petrol: 96.20, diesel: 84.26, cng: 75.00, electric: 7.8 }
  },
  "noida": {
    name: "Noida",
    state: "Uttar Pradesh",
    prices: { petrol: 94.63, diesel: 87.65, cng: 73.50, electric: 7.5 }
  },
  "gurgaon": {
    name: "Gurgaon",
    state: "Haryana",
    prices: { petrol: 95.00, diesel: 86.47, cng: 74.00, electric: 8.0 }
  },
  "gurugram": {
    name: "Gurugram",
    state: "Haryana",
    prices: { petrol: 95.00, diesel: 86.47, cng: 74.00, electric: 8.0 }
  },
  "faridabad": {
    name: "Faridabad",
    state: "Haryana",
    prices: { petrol: 95.00, diesel: 86.47, cng: 74.50, electric: 8.0 }
  },
  "ghaziabad": {
    name: "Ghaziabad",
    state: "Uttar Pradesh",
    prices: { petrol: 94.63, diesel: 87.65, cng: 73.00, electric: 7.5 }
  },
  "coimbatore": {
    name: "Coimbatore",
    state: "Tamil Nadu",
    prices: { petrol: 102.63, diesel: 94.24, cng: 78.00, electric: 7.8 }
  },
  "kochi": {
    name: "Kochi",
    state: "Kerala",
    prices: { petrol: 107.71, diesel: 96.52, cng: 80.00, electric: 7.5 }
  },
  "thiruvananthapuram": {
    name: "Thiruvananthapuram",
    state: "Kerala",
    prices: { petrol: 107.71, diesel: 96.52, cng: 80.00, electric: 7.5 }
  },
  "visakhapatnam": {
    name: "Visakhapatnam",
    state: "Andhra Pradesh",
    prices: { petrol: 108.05, diesel: 94.74, cng: 77.00, electric: 7.8 }
  },
  "vijayawada": {
    name: "Vijayawada",
    state: "Andhra Pradesh",
    prices: { petrol: 108.05, diesel: 94.74, cng: 77.00, electric: 7.8 }
  },
  "bhubaneswar": {
    name: "Bhubaneswar",
    state: "Odisha",
    prices: { petrol: 102.81, diesel: 94.49, cng: 78.00, electric: 7.5 }
  },
  "ranchi": {
    name: "Ranchi",
    state: "Jharkhand",
    prices: { petrol: 99.53, diesel: 94.76, cng: 80.00, electric: 7.5 }
  },
  "raipur": {
    name: "Raipur",
    state: "Chhattisgarh",
    prices: { petrol: 102.07, diesel: 93.89, cng: 79.00, electric: 7.5 }
  },
  "guwahati": {
    name: "Guwahati",
    state: "Assam",
    prices: { petrol: 96.14, diesel: 83.87, cng: 82.00, electric: 7.5 }
  },
  "dehradun": {
    name: "Dehradun",
    state: "Uttarakhand",
    prices: { petrol: 94.60, diesel: 87.44, cng: 76.00, electric: 7.8 }
  },
  "shimla": {
    name: "Shimla",
    state: "Himachal Pradesh",
    prices: { petrol: 97.02, diesel: 85.25, cng: 78.00, electric: 7.5 }
  },
  "amritsar": {
    name: "Amritsar",
    state: "Punjab",
    prices: { petrol: 95.54, diesel: 84.21, cng: 75.00, electric: 7.5 }
  },
  "ludhiana": {
    name: "Ludhiana",
    state: "Punjab",
    prices: { petrol: 95.54, diesel: 84.21, cng: 75.00, electric: 7.5 }
  },
  "agra": {
    name: "Agra",
    state: "Uttar Pradesh",
    prices: { petrol: 94.63, diesel: 87.65, cng: 73.00, electric: 7.5 }
  },
  "varanasi": {
    name: "Varanasi",
    state: "Uttar Pradesh",
    prices: { petrol: 94.63, diesel: 87.65, cng: 73.50, electric: 7.5 }
  },
  "meerut": {
    name: "Meerut",
    state: "Uttar Pradesh",
    prices: { petrol: 94.63, diesel: 87.65, cng: 73.50, electric: 7.5 }
  },
  "mysore": {
    name: "Mysore",
    state: "Karnataka",
    prices: { petrol: 101.94, diesel: 87.89, cng: 77.00, electric: 8.2 }
  },
  "mysuru": {
    name: "Mysuru",
    state: "Karnataka",
    prices: { petrol: 101.94, diesel: 87.89, cng: 77.00, electric: 8.2 }
  },
  "mangalore": {
    name: "Mangalore",
    state: "Karnataka",
    prices: { petrol: 101.94, diesel: 87.89, cng: 77.50, electric: 8.0 }
  },
  "hubli": {
    name: "Hubli",
    state: "Karnataka",
    prices: { petrol: 101.94, diesel: 87.89, cng: 78.00, electric: 8.0 }
  },
  "nashik": {
    name: "Nashik",
    state: "Maharashtra",
    prices: { petrol: 104.44, diesel: 91.56, cng: 75.00, electric: 8.0 }
  },
  "aurangabad": {
    name: "Aurangabad",
    state: "Maharashtra",
    prices: { petrol: 104.44, diesel: 91.56, cng: 75.50, electric: 8.0 }
  },
  "thane": {
    name: "Thane",
    state: "Maharashtra",
    prices: { petrol: 104.21, diesel: 92.15, cng: 75.00, electric: 8.5 }
  },
  "navi mumbai": {
    name: "Navi Mumbai",
    state: "Maharashtra",
    prices: { petrol: 104.21, diesel: 92.15, cng: 75.00, electric: 8.5 }
  },
  "jodhpur": {
    name: "Jodhpur",
    state: "Rajasthan",
    prices: { petrol: 104.88, diesel: 90.34, cng: 79.00, electric: 7.8 }
  },
  "udaipur": {
    name: "Udaipur",
    state: "Rajasthan",
    prices: { petrol: 104.88, diesel: 90.34, cng: 79.50, electric: 7.8 }
  },
  "kota": {
    name: "Kota",
    state: "Rajasthan",
    prices: { petrol: 104.88, diesel: 90.34, cng: 79.00, electric: 7.8 }
  },
  "srinagar": {
    name: "Srinagar",
    state: "Jammu & Kashmir",
    prices: { petrol: 101.40, diesel: 87.70, cng: 85.00, electric: 7.5 }
  },
  "jammu": {
    name: "Jammu",
    state: "Jammu & Kashmir",
    prices: { petrol: 101.40, diesel: 87.70, cng: 84.00, electric: 7.5 }
  },
};

// Default prices (India average) when city is not found
export const defaultFuelPrices: CityFuelPrices = {
  petrol: 105,
  diesel: 92,
  cng: 75,
  electric: 8,
};

// Find city from location string
export const findCityFromLocation = (locationString: string): CityData | null => {
  const lowerLocation = locationString.toLowerCase();
  
  // Check each city name
  for (const [key, cityData] of Object.entries(cityFuelPrices)) {
    if (lowerLocation.includes(key) || lowerLocation.includes(cityData.name.toLowerCase())) {
      return cityData;
    }
  }
  
  return null;
};
