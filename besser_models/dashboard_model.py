"""
BESSER BUML Domain Model — Global Live Dashboard
Course: Advance Software Development
Developer: Arda Hacifevzioglu
University of Luxembourg

This model defines the core domain entities of the dashboard application:
  - SearchHistory : stores every city search made by the user (persisted via sql.js)
  - City          : a geocoded location with coordinates and favourite flag
  - CurrencyRate  : a cached exchange rate snapshot between two currencies

Run with BESSER to generate SQLAlchemy models, REST API endpoints, etc.
  pip install besser
  python besser_models/dashboard_model.py
"""

from besser.BUML.metamodel.structural import (
    Class, Property, PrimitiveDataType,
    DomainModel, Multiplicity,
    BinaryAssociation, End,
)

# ---------------------------------------------------------------------------
# Primitive types
# ---------------------------------------------------------------------------
int_type      = PrimitiveDataType("int")
str_type      = PrimitiveDataType("str")
float_type    = PrimitiveDataType("float")
bool_type     = PrimitiveDataType("bool")
datetime_type = PrimitiveDataType("datetime")

# ---------------------------------------------------------------------------
# Entities
# ---------------------------------------------------------------------------

search_history: Class = Class(
    name="SearchHistory",
    attributes={
        Property(name="id",        type=int_type,      multiplicity=Multiplicity(1, 1)),
        Property(name="city_name", type=str_type,      multiplicity=Multiplicity(1, 1)),
        Property(name="country",   type=str_type,      multiplicity=Multiplicity(1, 1)),
        Property(name="timestamp", type=datetime_type, multiplicity=Multiplicity(1, 1)),
    },
)

city: Class = Class(
    name="City",
    attributes={
        Property(name="name",       type=str_type,   multiplicity=Multiplicity(1, 1)),
        Property(name="country",    type=str_type,   multiplicity=Multiplicity(1, 1)),
        Property(name="latitude",   type=float_type, multiplicity=Multiplicity(1, 1)),
        Property(name="longitude",  type=float_type, multiplicity=Multiplicity(1, 1)),
        Property(name="isFavorite", type=bool_type,  multiplicity=Multiplicity(1, 1)),
    },
)

currency_rate: Class = Class(
    name="CurrencyRate",
    attributes={
        Property(name="baseCurrency",   type=str_type,      multiplicity=Multiplicity(1, 1)),
        Property(name="targetCurrency", type=str_type,      multiplicity=Multiplicity(1, 1)),
        Property(name="rate",           type=float_type,    multiplicity=Multiplicity(1, 1)),
        Property(name="updatedAt",      type=datetime_type, multiplicity=Multiplicity(1, 1)),
    },
)

# ---------------------------------------------------------------------------
# Associations
# ---------------------------------------------------------------------------

# A City can appear in many SearchHistory records
city_to_searches: BinaryAssociation = BinaryAssociation(
    name="city_to_searches",
    ends={
        End(name="city",    type=city,           multiplicity=Multiplicity(0, 1)),
        End(name="history", type=search_history, multiplicity=Multiplicity(0, "*")),
    },
)

# ---------------------------------------------------------------------------
# Domain Model
# ---------------------------------------------------------------------------

dashboard_model: DomainModel = DomainModel(
    name="GlobalDashboardModel",
    types={search_history, city, currency_rate},
    associations={city_to_searches},
)

# ---------------------------------------------------------------------------
# Optional: generate SQLAlchemy code when run directly
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    try:
        from besser.generators.sql_alchemy import SQLAlchemyGenerator
        gen = SQLAlchemyGenerator(model=dashboard_model)
        gen.generate()
        print("SQLAlchemy models generated in output/")
    except ImportError:
        print("BESSER not installed. Run: pip install besser")
        print("Model loaded successfully:", dashboard_model.name)
        for cls in dashboard_model.types:
            print(f"  Class: {cls.name}")
            for prop in cls.attributes:
                print(f"    - {prop.name}: {prop.type.name}")
