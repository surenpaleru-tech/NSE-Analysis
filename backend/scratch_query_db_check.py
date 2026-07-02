import urllib.request
import json

def main():
    # Note: /db-check is mapped under the rewrite rules if it starts with /api
    # Wait, the Next.js rewrite maps '/api/:path*' to the backend '/api/:path*'!
    # But in main.py, the route is @app.get("/db-check") which is outside the /api/v1 router prefix!
    # Wait! In main.py, the route is @app.get("/db-check").
    # If the Next.js rewrite rule only proxies '/api/:path*', then:
    # '/api/db-check' will be rewritten to 'http://localhost:8000/api/db-check'.
    # But in main.py, we defined it as @app.get("/db-check") which is at the root level!
    # So 'http://localhost:8000/api/db-check' will return a 404!
    # Ah!!!
    # If the rewrite proxies '/api/:path*', and the route is @app.get("/db-check"), we should query 'https://nse-analysis-nrt4.onrender.com/api/db-check' or did we add it to the api router?
    # Wait, let's look at main.py:
    # 'app.include_router(api_router, prefix="/api/v1")'
    # 'app.get("/db-check")' is at root app level!
    # And the Next.js rewrite config:
    #   async rewrites() {
    #     return [
    #       {
    #         source: "/api/:path*",
    #         destination: "http://localhost:8000/api/:path*",
    #       },
    #     ];
    #   }
    # Wait, if source is '/api/:path*', it maps to '/api/:path*' at destination as well.
    # So if the client queries '/api/db-check', it rewrites to 'http://localhost:8000/api/db-check'.
    # But since it is @app.get("/db-check") in main.py, that will 404!
    # Wait! Is there an '/api/v1' prefix?
    # Let's test both '/api/db-check' and '/api/v1/db-check' to see which one works!
    
    urls = [
        'https://nse-analysis-nrt4.onrender.com/api/db-check',
        'https://nse-analysis-nrt4.onrender.com/api/v1/db-check',
        'https://nse-analysis-nrt4.onrender.com/db-check'
    ]
    for url in urls:
        print(f"\nQuerying: {url}")
        try:
            with urllib.request.urlopen(url, timeout=10) as f:
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
