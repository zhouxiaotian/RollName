~function () {
    function ajax(url) {
        var data = null;
        var xhr = new XMLHttpRequest;
        xhr.open('GET', url + '?_=' + Math.random(), false);
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4 && xhr.status === 200) {
                data = JSON.parse(xhr.responseText);
            }
        };
        xhr.send(null);
        return data;
    }

    window.ajax = ajax;
}();

//->分别获取正常的分组数据和特殊的分组数据
var normal = ajax('json/normal.json'),
    special = ajax('json/special.json'),
    maxGroup = 0;

//->把特殊的数据合并到正常的数据中(对于特殊人员多增加曝光率) && 把每一个小组人员随即打乱
~function () {
    for (var key in special) {
        if (special.hasOwnProperty(key)) {
            normal[key] = normal[key].concat(special[key], special[key], special[key], special[key]);
        }
    }
    for (key in normal) {
        if (normal.hasOwnProperty(key)) {
            maxGroup++;
            normal[key].sort(function () {
                return Math.random() > 0.5 ? 1 : -1;
            });
        }
    }
}();

//-----------------------------
//=>历史记录区域的操作
$(function () {
    var $menu = $('.menu'),
        $menuLink = $menu.find('a'),
        $menuList = $menu.find('ul'),
        scrollExample = null;
    $menuList.parent().css('height', document.documentElement.clientHeight - 40);

    //->点击清除:清除历史信息
    $menuLink.on('click', function () {
        var flag = confirm('确定要清除历史信息吗？这样可能会导致之前抽取过的学员再次被抽取！');
        if (flag) {
            localStorage.removeItem('readyPerson');
            computedHistory();
            $('#box').html('');
        }
    });

    computedHistory();
    function computedHistory() {
        var result = localStorage.getItem('readyPerson') || '';
        result = result.length <= 0 ? [] : result.split(/\s+/g);
        var str = ``;
        for (var i = result.length - 1; i >= 0; i--) {
            str += ` <li>${result[i]}</li>`;
        }
        $menuList.html(str);

        //->实现局部滚动
        if (!scrollExample) {
            scrollExample = new IScroll('.container', {
                scrollbars: true,
                mouseWheel: true,
                fadeScrollbars: true
            });
            return;
        }
        scrollExample.refresh();
        scrollExample.scrollTo(0, 0, 500);
    }

    window.computedHistory = computedHistory;
});

//-----------------------------
//=>随即抽取人员:先随即获取小组,在随机获取当前小组中的人员
Array.prototype.myDistinct = function myDistinct() {
    var obj = {};
    for (var i = 0; i < this.length; i++) {
        var cur = this[i];
        if (typeof obj[cur] !== 'undefined') {
            this[i] = this[this.length - 1];
            this.length--;
            i--;
            continue;
        }
        obj[cur] = cur;
    }
    obj = null;
    return this;
};

$(function () {
    var ready = localStorage.getItem('readyPerson') || '',
        $box = $('#box');

    //->抽取学员公式计算
    function fn() {
        var res = null;
        while (!res) {
            var ran = Math.round(Math.random() * (maxGroup - 1) + 1);
            var personAry = normal[ran],
                personLen = personAry.length;
            ran = Math.round(Math.random() * (personAry.length - 1));
            res = personAry[ran];

            //->验证是否已经抽选过了
            ready.indexOf(res) > -1 ? res = null : null;
        }
        $box.html(res);
    }

    //->按SPACE空格开始或者结束我们的人员抽取
    var isRun = false,
        autoTimer = null;
    $(document).on('keyup', function (e) {
        if (e.keyCode !== 32) return;

        //->选取中:设置定时器,每间隔50MS随机选取一个学员
        isRun = !isRun;
        if (isRun) {
            autoTimer = setInterval(fn, 50);
            return;
        }

        //->停止选取:把当前选取的最终结果进行存储
        clearInterval(autoTimer);
        var result = $box.html();
        ready = localStorage.getItem('readyPerson') || '';
        ready += result + ' ';
        localStorage.setItem('readyPerson', ready);

        //->重新计算历史区域的数据
        computedHistory();
    });

    //->找队友帮忙
    var $link = $('.link'),
        isClick = false,
        tempTimer = null,
        groupAry = [],
        isLook = false;
    $link.on('click', function () {
        if (isRun || isClick) return;
        isClick = true;

        //->根据当前的学员获取本小组内的全部学员
        var curPerson = $box.html();
        if (curPerson.length <= 0) return;

        if (!isLook) {
            $.each(normal, function (key, value) {
                value.indexOf(curPerson) > -1 ? groupAry = value : null;
            });
            groupAry.myDistinct();
            isLook = true;
        }

        $.each(groupAry, function (index, item) {
            if (item === curPerson) {
                groupAry.splice(index, 1);
            }
        });

        if (groupAry.length <= 0) {
            $box.html('');
            alert('你所在的队伍已经全军覆没了！');
            isClick = false;
            return;
        }

        if (groupAry.length === 1) {
            $box.html(groupAry[0]);
            isClick = false;
            setStorage();
            return;
        }

        //->在本组学员中随机获取(5S倒计时)
        var n = 3;
        $link.html('正在搜索靠谱的队友 (' + n + ')');
        groupFn(groupAry);
        autoTimer = setInterval(function () {
            if (n <= 0) {
                clearInterval(autoTimer);
                clearInterval(tempTimer);

                $link.html('找队友帮忙');
                isClick = false;

                setStorage();
                return;
            }
            $link.html('正在搜索靠谱的队友 (' + (--n) + ')');
        }, 1000);
    });

    function groupFn(groupAry) {
        tempTimer = setInterval(function () {
            var ran = Math.round(Math.random() * (groupAry.length - 1)),
                res = groupAry[ran];
            $box.html(res);
        }, 17);
    }

    //->向本地中存储信息
    function setStorage() {
        var res = $box.html(),
            ready = localStorage.getItem('readyPerson') || '';
        if (res.length === 0) return;
        if (ready.indexOf(res) === -1) {
            ready += res + ' ';
            localStorage.setItem('readyPerson', ready);
        }
        computedHistory();
    }
});