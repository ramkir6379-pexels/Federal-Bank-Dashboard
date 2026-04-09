import json
import os
from pyproj import Transformer
from shapely.geometry import shape

class GeoProcessor:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(GeoProcessor, cls).__new__(cls)
            cls._instance._initialize()
        return cls._instance

    def _initialize(self):
        print("Initializing GeoProcessor... This may take a few seconds.")
        self.pincode_data      = None
        self.street_data       = None
        self.pincode_map       = {}
        self.street_by_pincode = {}
        self.pincode_centroids = {}
        self.pincode_intel     = {}

        base_dir     = os.path.dirname(os.path.abspath(__file__))
        pincode_path = os.path.join(base_dir, 'data', 'Pincode.geojson')
        street_path  = os.path.join(base_dir, 'data', 'Street.geojson')

        with open(pincode_path, 'r', encoding='utf-8') as f:
            self.pincode_data = json.load(f)

        with open(street_path, 'r', encoding='utf-8') as f:
            raw_street_data = json.load(f)

        transformer = Transformer.from_crs("EPSG:32644", "EPSG:4326", always_xy=True)

        transformed_streets = []
        for feature in raw_street_data.get('features', []):
            geom = feature['geometry']
            if geom['type'] == 'MultiLineString':
                new_coords = []
                for line in geom['coordinates']:
                    new_line = []
                    for coord in line:
                        lon, lat = transformer.transform(coord[0], coord[1])
                        new_line.append([lon, lat])
                    new_coords.append(new_line)
                feature['geometry']['coordinates'] = new_coords
                transformed_streets.append(feature)
            elif geom['type'] == 'LineString':
                new_line = []
                for coord in geom['coordinates']:
                    lon, lat = transformer.transform(coord[0], coord[1])
                    new_line.append([lon, lat])
                feature['geometry']['coordinates'] = new_line
                transformed_streets.append(feature)

        pincode_shapes = []
        pincode_names  = []

        for feature in self.pincode_data.get('features', []):
            props   = feature['properties']
            pincode = props.get('Pincode')

            self.pincode_map[pincode]       = feature
            self.street_by_pincode[pincode] = []

            p_shape = shape(feature['geometry'])
            pincode_shapes.append(p_shape)
            pincode_names.append(pincode)

            centroid = p_shape.centroid
            lat = round(centroid.y, 6)
            lng = round(centroid.x, 6)

            self.pincode_centroids[pincode] = {
                "pincode"  : pincode,
                "name"     : props.get('Office_Nam', pincode),
                "division" : props.get('Division', ''),
                "lat"      : lat,
                "lng"      : lng,
            }

            # Intelligence data from new geojson properties
            self.pincode_intel[pincode] = {
                "pincode"          : pincode,
                "name"             : props.get('Office_Nam', pincode),
                "division"         : props.get('Division', ''),
                "lat"              : lat,
                "lng"              : lng,
                "bank_branches"    : props.get('bank_branc', 0),
                "atm_count"        : props.get('atm_count', 0),
                "banking_presence" : props.get('banking_pr', 0),
                "bank_opportunity" : props.get('bank_oppor', 0),
                "cafes"            : props.get('cafes', 0),
                "restaurants"      : props.get('restaurant', 0),
                "malls"            : props.get('malls', 0),
                "retails"          : props.get('retails', 0),
                "hotels"           : props.get('hotels', 0),
                "premium_biz"      : props.get('premium_bu', 0),
                "car_showrooms"    : props.get('car_showro', 0),
                "commercial_idx"   : props.get('commercial', 0),
                "schools"          : props.get('schools', 0),
                "colleges"         : props.get('colleges', 0),
                "education_idx"    : props.get('educationa', 0),
                "bungalows"        : props.get('bungalows', 0),
                "gated_comm"       : props.get('gated_comm', 0),
                "jewels"           : props.get('jewels', 0),
                "luxury_villas"    : props.get('luxury_vil', 0),
                "villas"           : props.get('villas', 0),
                "villa_gated"      : props.get('villa_gate', 0),
                "residential"      : props.get('residentia', 0),
                "petrol_stations"  : props.get('petrol_sta', 0),
                "wealth_index"     : props.get('wealth_ind', 0),
            }

        from shapely.strtree import STRtree
        tree = STRtree(pincode_shapes)

        for street_feature in transformed_streets:
            s_shape = shape(street_feature['geometry'])
            indices = tree.query(s_shape)
            for idx in indices:
                if pincode_shapes[idx].intersects(s_shape):
                    pcode = pincode_names[idx]
                    self.street_by_pincode[pcode].append(street_feature)

        self.street_data = {
            "type"    : "FeatureCollection",
            "features": transformed_streets,
        }
        print("GeoProcessor initialization complete.")

    def get_all_pincodes(self):
        return self.pincode_data

    def get_streets_for_pincode(self, pincode):
        return {
            "type"    : "FeatureCollection",
            "features": self.street_by_pincode.get(pincode, []),
        }

    def get_all_pincode_centroids(self):
        return list(self.pincode_centroids.values())

    def get_pincode_centroid(self, pincode):
        return self.pincode_centroids.get(pincode)

    def get_all_intelligence(self):
        """Return intelligence scores for ALL pincodes."""
        return list(self.pincode_intel.values())

    def get_pincode_intelligence(self, pincode):
        """Return intelligence scores for a single pincode."""
        return self.pincode_intel.get(pincode)
