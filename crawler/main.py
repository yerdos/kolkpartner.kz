from crawler.driver import create_driver
from crawler.guazi_page import crawl_guazi_detail
from supabase.vehicles import insert_vehicle
from supabase.cost_breakdown import insert_cost
from supabase.inspection_reports import insert_inspection_report

def main():
    driver = create_driver()

    url = input("URL: ")
    car, inspection = crawl_guazi_detail(driver, url)

    vehicle = insert_vehicle(car)
    insert_cost(vehicle["id"], vehicle["price_usd"])

    if inspection:
        insert_inspection_report(vehicle["id"], inspection)
