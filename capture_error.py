import traceback
try:
    import backend.verify_speed as vs
    vs.verify_speed_optimization()
except Exception:
    with open('error_trace.log', 'w') as f:
        f.write(traceback.format_exc())
    print("Error captured in error_trace.log")
