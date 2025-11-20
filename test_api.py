import requests
import time

def test_search():
    try:
        print("Testing /api/suggest with query 'rel'...")
        response = requests.get('http://localhost:5000/api/suggest?q=rel')
        if response.status_code == 200:
            data = response.json()
            print(f"Status: {response.status_code}")
            print(f"Results found: {len(data)}")
            if len(data) > 0:
                print("First result:", data[0])
            else:
                print("No results found. ALL_NSE_STOCKS might be empty.")
        else:
            print(f"Failed. Status: {response.status_code}")
            print(response.text)
    except Exception as e:
        print(f"Error connecting to server: {e}")

if __name__ == "__main__":
    test_search()
