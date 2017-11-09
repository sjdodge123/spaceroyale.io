/*
 * @Author: Vinod Selvin
 * @Desc: Shows progress bar.
 * @Params: _upto -> upto that percentage.
 */
function __showProgress(_upto, _cir_progress_id,_upto2) {
    if(_upto2 != null){
        var _cir_progress2 = document.getElementById(_cir_progress_id).getElementsByClassName("_cir_P_z")[0];
        var input_percentage2 = (_upto2 / 100) * 382;
        _cir_progress2.style.strokeDasharray = input_percentage2 + ', 1000';
    }
    var _cir_progress = document.getElementById(_cir_progress_id).getElementsByClassName("_cir_P_y")[0];
     _input_percentage = (_upto / 100) * 382;
    _cir_progress.style.strokeDasharray = _input_percentage + ', 1000';
}

function __getProgress(_cir_progress_id){
    var _cir_progress = document.getElementById(_cir_progress_id).getElementsByClassName("_cir_P_y")[0];
    return _cir_progress.style.strokeDasharray;
}
