import urllib.request
import json

def main():
    urls = [
        'https://nse-analysis-nrt4.onrender.com/api/test-db',
        'https://nse-analysis-nrt4.onrender.com/api/db-check'
    ]
    for url in urls:
        print(f"\nQuerying: {url}")
        try:
            with urllib.request.urlopen(url, timeout=20) as f:
                print("Status:", f.status)
                print(f.read().decode())
        except Exception as e:
            print("Error:", e)
            if hasattr(e, 'read'):
                try:
                    print("Error Body:", e.read().decode())
                except:
                    pass

if __name__ == "__main__":
    main()
