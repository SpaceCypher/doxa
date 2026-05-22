import random
from perlin_noise import PerlinNoise

def generate_world(seed: int = None, width: int = 100, height: int = 100):
    if seed is None:
        seed = random.randint(0, 999999999)
    
    # We can use multiple octaves of noise for a natural look
    noise1 = PerlinNoise(octaves=3, seed=seed)
    noise2 = PerlinNoise(octaves=6, seed=seed)
    noise3 = PerlinNoise(octaves=12, seed=seed)

    world_map = []
    for y in range(height):
        row = []
        for x in range(width):
            # Normalize coordinates to 0.0 - 1.0
            nx = x / width
            ny = y / height
            
            # Combine noise layers (weighted)
            val = noise1([nx, ny])
            val += 0.5 * noise2([nx, ny])
            val += 0.25 * noise3([nx, ny])
            
            # The range of perlin noise combined this way is approx -1.0 to 1.0
            # Let's map it roughly to 0.0 to 1.0
            val = (val + 1.0) / 2.0
            
            # Map val to terrain type
            # 0: Deep Water, 1: Shallow Water, 2: Sand, 3: Grass, 4: Forest, 5: Mountain
            if val < 0.3:
                terrain = 0 # Deep Water
            elif val < 0.4:
                terrain = 1 # Water
            elif val < 0.45:
                terrain = 2 # Sand
            elif val < 0.65:
                terrain = 3 # Grass
            elif val < 0.8:
                terrain = 4 # Forest
            else:
                terrain = 5 # Mountain
                
            row.append(terrain)
        world_map.append(row)
        
    return seed, world_map
