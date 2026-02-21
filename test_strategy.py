#!/usr/bin/env python3
"""
Test script to run simulation and analyze custom agent performance
"""
import asyncio
import websockets
import json
import time

async def test_simulation():
    uri = "ws://localhost:8000/ws"
    
    try:
        async with websockets.connect(uri) as websocket:
            print("✅ Connected to WebSocket")
            
            # Wait for connection message
            response = await websocket.recv()
            print(f"📨 {response}")
            
            # Start simulation with default strategy (empty prompt)
            start_command = {
                "command": "start_simulation",
                "num_ticks": 5,
                "tick_delay": 0.5,
                "market_type": "nifty50",
                "custom_agent": {
                    "name": "Test Bot",
                    "prompt": "",  # Empty = use default
                    "capital": 100000
                }
            }
            
            print(f"\n🚀 Starting simulation...")
            print(f"   Market: NIFTY 50")
            print(f"   Days: 5")
            print(f"   Strategy: Default (Relative Strength Rotation)")
            
            await websocket.send(json.dumps(start_command))
            
            # Collect results
            my_agent_results = []
            final_leaderboard = None
            tick_count = 0
            
            while True:
                try:
                    message = await asyncio.wait_for(websocket.recv(), timeout=60.0)
                    data = json.loads(message)
                    
                    # Track ticks
                    if "tick" in data:
                        tick_count = data["tick"] + 1
                        print(f"\n📊 Day {tick_count}/5")
                        
                        # Track my_agent portfolio
                        if "portfolios" in data and "my_agent" in data["portfolios"]:
                            portfolio = data["portfolios"]["my_agent"]
                            my_agent_results.append({
                                "tick": tick_count,
                                "value": portfolio.get("value", 0),
                                "pnl": portfolio.get("pnl", 0),
                                "pnl_pct": portfolio.get("pnl_pct", 0)
                            })
                            print(f"   My Agent: ₹{portfolio.get('value', 0):,.0f} ({portfolio.get('pnl_pct', 0):+.2f}%)")
                    
                    # Check for simulation complete
                    if data.get("type") == "simulation_complete":
                        print(f"\n🏁 Simulation Complete!")
                        final_leaderboard = data.get("leaderboard", [])
                        break
                        
                except asyncio.TimeoutError:
                    print("⏱️  Timeout waiting for message")
                    break
                except Exception as e:
                    print(f"❌ Error: {e}")
                    break
            
            # Analyze results
            print("\n" + "="*60)
            print("📈 PERFORMANCE ANALYSIS")
            print("="*60)
            
            if my_agent_results:
                print(f"\n🤖 My Agent Performance:")
                for result in my_agent_results:
                    print(f"   Day {result['tick']}: ₹{result['value']:,.0f} ({result['pnl_pct']:+.2f}%)")
                
                final_result = my_agent_results[-1]
                print(f"\n💰 Final P&L: ₹{final_result['pnl']:+,.0f} ({final_result['pnl_pct']:+.2f}%)")
            
            if final_leaderboard:
                print(f"\n🏆 Final Leaderboard:")
                for agent in final_leaderboard[:5]:
                    marker = " ⭐ (MY BOT)" if agent.get("id") == "my_agent" else ""
                    print(f"   #{agent['rank']} {agent['name']}: {agent['pnl_pct']:+.2f}% (₹{agent['pnl']:+,.0f}){marker}")
                
                # Find my agent's rank
                my_agent = next((a for a in final_leaderboard if a.get("id") == "my_agent"), None)
                if my_agent:
                    print(f"\n📊 My Agent Rank: #{my_agent['rank']} out of {len(final_leaderboard)}")
                    
                    # Analysis
                    if my_agent['rank'] <= 3:
                        print("✅ EXCELLENT! Top 3 finish!")
                    elif my_agent['rank'] <= 5:
                        print("✅ GOOD! Top 5 finish!")
                    elif my_agent['pnl'] > 0:
                        print("⚠️  PROFITABLE but needs improvement")
                    else:
                        print("❌ LOSS - Strategy needs adjustment")
                    
                    return my_agent
            
            return None
            
    except Exception as e:
        print(f"❌ Connection error: {e}")
        return None

if __name__ == "__main__":
    print("="*60)
    print("🧪 STRATEGY TESTING FRAMEWORK")
    print("="*60)
    result = asyncio.run(test_simulation())
    
    if result:
        print(f"\n✅ Test completed successfully")
    else:
        print(f"\n❌ Test failed")
