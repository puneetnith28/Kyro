"""
Kyro Load Tester
----------------
Simulates 100 concurrent browser extensions capturing context simultaneously.
Reports on success rate, throughput, and latency percentiles (p50, p90, p99).
"""

import asyncio
import time
import datetime
import statistics
import logging

try:
    import aiohttp
except ImportError:
    print("aiohttp not found. Please run: pip install aiohttp")
    exit(1)

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(message)s")

# Configuration
CONCURRENT_USERS = 100
TARGET_URL = "http://localhost:8000/api/capture"

def generate_payload(i):
    return {
        "url": f"https://example.com/load-test-{i}",
        "title": f"Load Test Page {i}",
        "domain": "example.com",
        "type": "web_page",
        "text": f"This is synthetic load test data for concurrent user {i}.",
        "timestamp": datetime.datetime.utcnow().isoformat(),
    }

async def simulate_user(session, user_id):
    payload = generate_payload(user_id)
    start_time = time.perf_counter()
    
    try:
        async with session.post(TARGET_URL, json=payload, timeout=5.0) as response:
            status = response.status
            await response.read()
            end_time = time.perf_counter()
            return status, (end_time - start_time) * 1000
    except Exception as e:
        end_time = time.perf_counter()
        return str(e), (end_time - start_time) * 1000

async def main():
    print(f"🚀 Starting Load Test: {CONCURRENT_USERS} concurrent captures")
    print(f"🎯 Target: {TARGET_URL}")
    print("-" * 50)
    
    connector = aiohttp.TCPConnector(limit=CONCURRENT_USERS)
    async with aiohttp.ClientSession(connector=connector) as session:
        tasks = [simulate_user(session, i) for i in range(CONCURRENT_USERS)]
        
        start_time = time.perf_counter()
        results = await asyncio.gather(*tasks)
        total_time = time.perf_counter() - start_time
        
        latencies = []
        success_count = 0
        errors = {}
        
        for status, latency in results:
            latencies.append(latency)
            if status == 200:
                success_count += 1
            else:
                errors[status] = errors.get(status, 0) + 1
                
        latencies.sort()
        avg_lat = statistics.mean(latencies)
        p50 = latencies[int(len(latencies) * 0.50)]
        p90 = latencies[int(len(latencies) * 0.90)]
        p99 = latencies[int(len(latencies) * 0.99)]
        
        print("\n📊 Results Summary")
        print("-" * 50)
        print(f"Total Requests  : {CONCURRENT_USERS}")
        print(f"Success Rate    : {(success_count / CONCURRENT_USERS) * 100:.1f}% ({success_count}/{CONCURRENT_USERS})")
        print(f"Total Time      : {total_time:.2f} seconds")
        print(f"Throughput      : {CONCURRENT_USERS / total_time:.2f} req/sec")
        print("-" * 50)
        print("⏱️  Latency Percentiles (ms)")
        print(f"Average         : {avg_lat:.2f} ms")
        print(f"p50 (Median)    : {p50:.2f} ms")
        print(f"p90             : {p90:.2f} ms")
        print(f"p99             : {p99:.2f} ms")
        
        if errors:
            print("-" * 50)
            print("⚠️  Errors Encountered:")
            for status, count in errors.items():
                print(f"  [{status}] : {count} times")

if __name__ == "__main__":
    asyncio.run(main())
